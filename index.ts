import express from "express";
import { MongoClient, ObjectId } from "mongodb";

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

interface Profile {
    _id?:ObjectId,
    USER_ID:number,
    name:string, 
    email:string,
    description:string,
    friends:number[],
    picture:string,
    posts:string[]
}

//Programmaconstante id voor de ingelogde user
const LOGGED_IN_USER_ID:number = 30;

//tijdlijn is de home pagina
app.get("/", async(req, res) => {
    const profiles:Profile[] = await client.db("WebOntwikkeling").collection("Profiles").find<Profile>({}).toArray();
    res.render("timeline", {profiles});
});

app.get("/mytimeline", async(req, res) => {
    const profiles:Profile[] = await client.db("WebOntwikkeling").collection("Profiles").find<Profile>({}).toArray();
    const loggedInProfile:Profile | undefined = profiles.find((profile)=>profile.USER_ID === LOGGED_IN_USER_ID);
    res.render("mytimeline", {loggedInProfile});
});

app.get("/profiles", async(req, res) => {
    const profiles:Profile[] = await client.db("WebOntwikkeling").collection("Profiles").find<Profile>({}).toArray();
    res.render("profiles", {profiles, friends:profiles.find((profile) => profile.USER_ID === LOGGED_IN_USER_ID)?.friends});
});

app.get("/myprofile", async(req, res) => {
    const profiles:Profile[] = await client.db("WebOntwikkeling").collection("Profiles").find<Profile>({}).toArray();
    const loggedInProfile:Profile | undefined = profiles.find((profile) => profile.USER_ID === LOGGED_IN_USER_ID);

    res.render("myprofile", {loggedInProfile});
});

app.post("/addfriend", async(req, res) => {
    const profiles:Profile[] = await client.db("WebOntwikkeling").collection("Profiles").find<Profile>({}).toArray();
    const loggedInProfile:Profile | undefined = profiles.find((profile)=>profile.USER_ID === LOGGED_IN_USER_ID);
    const addedFriendId:number = parseInt(req.body.USER_ID);
    const friendProfile:Profile | undefined = profiles.find((profile)=>profile.USER_ID === addedFriendId);
    loggedInProfile?.friends.push(addedFriendId);
    friendProfile?.friends.push(LOGGED_IN_USER_ID);
    await client.db("WebOntwikkeling").collection("Profiles").updateOne(
        { USER_ID: LOGGED_IN_USER_ID },
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
            { USER_ID: LOGGED_IN_USER_ID },
            { $set: {description:updatedDescription}});
    }
    res.redirect("/");
});

app.post("/createpost", async(req, res) => {
    const newPost = req.body.post;
    if (newPost !== ""){
        await client.db("WebOntwikkeling").collection("Profiles").updateOne(
            { USER_ID: LOGGED_IN_USER_ID },
            { $push: {posts: newPost}});
    }
    res.redirect("/");
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
    await client.db("WebOntwikkeling").collection("Profiles").insertMany(profiles);*/
    console.log(`Local url: http://localhost:${app.get("port")}`);
});
