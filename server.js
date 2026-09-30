
const express = require("express");
const cors = require("cors");
const path = require("path");

require("dotenv").config();

const authRoutes = require("./routes/authRoutes");
const fileRoutes = require("./routes/fileRoutes");

const {
    startBlockchainWorker
} = require("./services/blockchainWorker");

const app = express();

/* REQUEST LOGGER */
app.use((req, res, next) => {
    console.log("REQUEST:", req.method, req.url);
    next();
});

/* MIDDLEWARE */
app.use(cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* API ROUTES */
app.use("/api/auth", authRoutes);
app.use("/api/files", fileRoutes);

/* FRONTEND */
const frontendPath = path.join(
    __dirname,
    "frontend"
);

app.use(express.static(frontendPath));

app.get("/", (req, res) => {
    res.sendFile(
        path.join(frontendPath, "index.html")
    );
});

/* SERVER */
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(
        `Server running on port ${PORT}`
    );

    console.log(
        `Open: http://localhost:${PORT}`
    );

    startBlockchainWorker();
});
