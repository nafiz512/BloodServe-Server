const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 5000;

//midleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.qdankrh.mongodb.net/?appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    },
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();
        // Send a ping to confirm a successful connection
        // await client.db("admin").command({ ping: 1 });
        const db = client.db("BloodServe");
        const usersColl = db.collection("users");
        const donationRequest = db.collection("donation-requests")
        app.post("/users", async (req, res) => {
            const result = await usersColl.insertOne(req.body);
            res.send(result);
        });
        app.get("/users/role", async (req, res) => {
            const { email } = req.query
            const query = { email };
            const user = await usersColl.findOne(query);
            res.send(user);
        });
        app.get("/users/donor", async (req, res) => {
            const { bloodGroup, district, upazila } = req.query;
            const query = { role: "donor", bloodGroup: bloodGroup, district: district, upazila: upazila };
            const users = await usersColl.find(query).toArray();
            res.send(users);
        });
        app.get("/all-users", async (req, res) => {
            try {
                // Get query parameters
                const page = parseInt(req.query.page) || 1;
                const limit = parseInt(req.query.limit) || 4;
                const skip = (page - 1) * limit;

                //  Get total count 
                const totalCount = await usersColl.countDocuments();
                const totalPages = Math.ceil(totalCount / limit);

                const users = await usersColl.find()
                    .skip(skip)
                    .limit(limit)
                    .toArray();

                res.status(200).send({
                    data: users,
                    totalPages: totalPages,
                    currentPage: page,
                    totalCount: totalCount
                });

            } catch (error) {
                console.error("Error fetching paginated users:", error);
                res.status(500).send({ message: "Failed to retrieve user data." });
            }
        });
        app.patch('/users/:email', async (req, res) => {
            const email = req.params.email;
            // console.log(email);

            if (!email) {
                return res.status(401).send("unathorized access");
            }
            const query = { email: email };
            const update = { $set: req.body };
            const options = {};
            const result = await usersColl.updateOne(query, update, options);
            res.send(result);
        });
        //donation related api 
        app.post('/donation-request', async (req, res) => {
            const result = await donationRequest.insertOne(req.body)
            res.send(result)
        })
        app.get('/donation-requests-recent', async (req, res) => {
            const { email, limit = 5 } = req.query;

            const query = email ? { requesterEmail: email } : {};

            const result = await donationRequest
                .find(query)
                .sort({ createdAt: -1 })
                .limit(parseInt(limit))
                .toArray();

            res.send(result);
        });
        app.get('/donation-requests/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) };
            const result = await donationRequest.findOne(query);
            res.send(result);
        });
        app.delete('/donation-requests/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) };
            const result = await donationRequest.deleteOne(query);
            res.send(result);
        });

        app.get("/donation-requests", async (req, res) => {
            try {
                const email = req.query.email;
                const page = parseInt(req.query.page) || 1;
                const limit = parseInt(req.query.limit) || 0;
                const skip = (page - 1) * limit;
                const query = email ? { requesterEmail: email } : {};
                const total = await donationRequest.countDocuments(query);
                const requests = await donationRequest
                    .find(query)
                    .skip(skip)
                    .limit(limit)
                    .toArray();
                res.send({
                    data: requests,
                    total,
                    page,
                    totalPages: Math.ceil(total / limit),
                });
            } catch (err) {
                res.status(500).send({ message: "Failed to load requests" });
            }
        });
        app.patch('/donation-request/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) };
            const update = { $set: req.body };
            const options = {};
            const result = await donationRequest.updateOne(query, update, options);
            res.send(result);
        });
        app.get('/total-donors', async (req, res) => {
            const totaldonor = await usersColl.find({ role: "donor" }).toArray()
            res.send(totaldonor.length)
        })
        app.get('/total-donation-requests', async (req, res) => {
            const total = await donationRequest.countDocuments({});
            res.send(total)
        })


    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);

// Test Route
app.get("/", (req, res) => {
    res.send("Express server is running...");
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
