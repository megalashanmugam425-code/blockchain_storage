const express = require("express");
const multer = require("multer");
const path = require("path");

const authenticateToken =
    require("../middleware/authMiddleware");

const {
    uploadFile,
    getMyFiles
} = require("../controllers/fileController");

const router = express.Router();

const upload = multer({
    dest: path.join(__dirname, "..", "uploads"),
    limits: {
        fileSize: 50 * 1024 * 1024
    }
});

router.post(
    "/upload",
    authenticateToken,
    upload.single("file"),
    uploadFile
);

router.get(
    "/my-files",
    authenticateToken,
    getMyFiles
);

module.exports = router;
