import express from "express";
import { MongoClient, ObjectId } from "mongodb";
import session from "express-session";
import MongoStore from "connect-mongo";

//mongoDb setup
const uri = "mongodb+srv://benjamin:benjamin@benjamingamrekeli.zjbjwl8.mongodb.net/?retryWrites=true&w=majority";
const client = new MongoClient(uri);

//express setup
const app = express();
app.set("view engine", "ejs");
app.set("port", 3000);
app.use(express.static('public'));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended:true}));
app.use(session({
    secret: "ben's key",
    resave: false,
    saveUninitialized:false,
    cookie:{secure:false},
    store: MongoStore.create({client})
}));

declare module "express-session"{
    export interface SessionData{
        LOGGED_IN_USER_ID:number;
    }
}

interface Profile {
    _id?:ObjectId,
    USER_ID:number,
    name:string,
    password:string, 
    email:string,
    description:string,
    friends:number[],
    picture:string,
    posts:string[]
}

//Programmaconstante id voor de ingelogde user
// const LOGGED_IN_USER_ID:number = 23;

//tijdlijn is de home pagina
app.get("/", async(req, res) => {
    if (req.session.LOGGED_IN_USER_ID){
        const profiles:Profile[] = await client.db("WebOntwikkeling").collection("Profiles").find<Profile>({}).toArray();
        res.render("timeline", {profiles});
    } else {
        res.redirect("login");
    }
});

app.get("/mytimeline", async(req, res) => {
    if (req.session.LOGGED_IN_USER_ID){
        const profiles:Profile[] = await client.db("WebOntwikkeling").collection("Profiles").find<Profile>({}).toArray();
        const loggedInProfile:Profile | undefined = profiles.find((profile)=>profile.USER_ID === req.session.LOGGED_IN_USER_ID);
        res.render("mytimeline", {loggedInProfile});
    } else {
        res.redirect("login");
    }
});

app.get("/profiles", async(req, res) => {
    if (req.session.LOGGED_IN_USER_ID){
        const profiles:Profile[] = await client.db("WebOntwikkeling").collection("Profiles").find<Profile>({}).toArray();
        res.render("profiles", {profiles, friends:profiles.find((profile) => profile.USER_ID === req.session.LOGGED_IN_USER_ID)?.friends});
    } else {
        res.redirect("login");
    }
});

app.get("/myprofile", async(req, res) => {
    if (req.session.LOGGED_IN_USER_ID){
        const profiles:Profile[] = await client.db("WebOntwikkeling").collection("Profiles").find<Profile>({}).toArray();
        const loggedInProfile:Profile | undefined = profiles.find((profile) => profile.USER_ID === req.session.LOGGED_IN_USER_ID);
        res.render("myprofile", {loggedInProfile});
    } else {
        res.redirect("login");
    }
});

app.get("/login", async(req, res) => {
    res.render("login");
});

app.post("/addfriend", async(req, res) => {
    const profiles:Profile[] = await client.db("WebOntwikkeling").collection("Profiles").find<Profile>({}).toArray();
    const loggedInProfile:Profile | undefined = profiles.find((profile)=>profile.USER_ID === req.session.LOGGED_IN_USER_ID);
    const addedFriendId:number = parseInt(req.body.USER_ID);
    const friendProfile:Profile | undefined = profiles.find((profile)=>profile.USER_ID === addedFriendId);
    loggedInProfile?.friends.push(addedFriendId);
    if (req.session.LOGGED_IN_USER_ID){
        friendProfile?.friends.push(req.session.LOGGED_IN_USER_ID);
    }
    await client.db("WebOntwikkeling").collection("Profiles").updateOne(
        { USER_ID: req.session.LOGGED_IN_USER_ID },
        { $set: {friends: loggedInProfile?.friends} }
    );
    await client.db("WebOntwikkeling").collection("Profiles").updateOne(
        { USER_ID: addedFriendId },
        { $set: {friends: friendProfile?.friends} }
    );
    res.redirect("/profiles");
});

app.post("/updateprofile", async(req, res) => {
    const updatedDescription = req.body.description;
    if (updatedDescription !== ""){
        await client.db("WebOntwikkeling").collection("Profiles").updateOne(
            { USER_ID: req.session.LOGGED_IN_USER_ID },
            { $set: {description:updatedDescription}});
    }
    res.redirect("/");
});

app.post("/createpost", async(req, res) => {
    const newPost = req.body.post;
    if (newPost !== ""){
        await client.db("WebOntwikkeling").collection("Profiles").updateOne(
            { USER_ID: req.session.LOGGED_IN_USER_ID },
            { $push: {posts: newPost}});
    }
    res.redirect("/");
});

app.post("/login", async(req, res) => {
    const profiles:Profile[] = await client.db("WebOntwikkeling").collection("Profiles").find<Profile>({}).toArray();
    const name = req.body.name;
    const password = req.body.password;
    const isValidProfile:Profile|null = await client.db("WebOntwikkeling").collection("Profiles").findOne<Profile>({name: name, password:password});
    if (isValidProfile){
        const loggedInProfile: Profile = isValidProfile;
        req.session.LOGGED_IN_USER_ID = loggedInProfile.USER_ID;
        res.render("timeline", {profiles:profiles, loggedInProfile:loggedInProfile})
    } else {
        res.render("login", {message:"login failed"});
    }
});

app.post("/logout", async(req, res) => {
    req.session.destroy(() => res.redirect("login"));
});

app.listen(app.get("port"), async () => {
    await client.connect();
    //genereren van random gebruikers profielen en toevoegen aan de database bij het opstarten van de server
    /*await client.db("WebOntwikkeling").collection("Profiles").drop();
    const profilesJSON = await (await fetch("https://randomuser.me/api/?inc=name,email,picture&nat=us&results=50")).json();
    const profilesData = profilesJSON.results;
    const uniquePictureUrls:string[] = [];
    let nextId:number = 0;
    const profiles:Profile[] = profilesData
        .map((profileData:any)=>{
            const { name, email, picture } = profileData;
            const fullName: string = `${name.first} ${name.last}`;
            const pictureUrl:string = picture.large;
            if (uniquePictureUrls.includes(pictureUrl)) {
                
                return null;
            }
            uniquePictureUrls.push(pictureUrl);
            const profile: Profile = {
                USER_ID: nextId,
                name: fullName,
                email:email,
                description:"",
                friends:[],
                picture: pictureUrl
            };
            nextId++;
            return profile;
    }).filter((profile:Profile) => profile !== null);
    
    //genereren van random passwords voor elke gebruiker (moet maar 1 keer gerunt worden)
    await client.db("WebOntwikkeling").collection("Profiles").insertMany(profiles);*/
    // function generateRandomPassword(length:number) {
    //     const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    //     let result = '';
    
    //     for (let i = 0; i < length; i++) {
    //         const randomIndex = Math.floor(Math.random() * characters.length);
    //         result += characters.charAt(randomIndex);
    //     }
    
    //     return result;
    // }
    
    // for (let profile of await client.db("WebOntwikkeling").collection("Profiles").find<Profile>({}).toArray()){
    //     await client.db("WebOntwikkeling").collection("Profiles").updateOne({USER_ID: profile.USER_ID},{$set:{password:generateRandomPassword(5)}});
    // }
    console.log(`Local url: http://localhost:${app.get("port")}`);
});

//login pagina
//logingegevens bijhouden in database
//if else overal voor null waarden