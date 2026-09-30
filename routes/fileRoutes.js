
const express = require("express");
const multer = require("multer");
const path = require("path");

const authenticateToken =
    require("../middleware/authMiddleware");

const {
    uploadFile,
    getMyFiles,
    getFileDetails,
    verifyFile,
    downloadFile,
    recoverPrimary,
    deleteFile
} = require("../controllers/fileController");

const {
    getActivityLogs,
    getFileActivityLogs
} = require("../controllers/fileActivityController");

const router = express.Router();

const upload = multer({
    dest: path.join(
        __dirname,
        "..",
        "uploads"
    ),
    limits: {
        fileSize: 300 * 1024 * 1024
    }
});

/*
|--------------------------------------------------------------------------
| Upload File
|--------------------------------------------------------------------------
*/

router.post(
    "/upload",
    authenticateToken,
    upload.single("file"),
    uploadFile
);

/*
|--------------------------------------------------------------------------
| Get My Files
|--------------------------------------------------------------------------
*/

router.get(
    "/my-files",
    authenticateToken,
    getMyFiles
);

/*
|--------------------------------------------------------------------------
| File Verification
|--------------------------------------------------------------------------
*/

router.get(
    "/:id/verify",
    authenticateToken,
    verifyFile
);

/*
|--------------------------------------------------------------------------
| File Details
|--------------------------------------------------------------------------
*/

router.get(
    "/:id/details",
    authenticateToken,
    getFileDetails
);

/*
|--------------------------------------------------------------------------
| File Download
|--------------------------------------------------------------------------
*/

router.get(
    "/:id/download",
    authenticateToken,
    downloadFile
);

/*
|--------------------------------------------------------------------------
| Delete File (Soft Delete)
|--------------------------------------------------------------------------
*/

router.delete(
    "/:id",
    authenticateToken,
    deleteFile
);

/*
|--------------------------------------------------------------------------
| Recover Primary Backup
|--------------------------------------------------------------------------
*/

router.get(
    "/recover-primary/:fileName",
    authenticateToken,
    recoverPrimary
);

/*
|--------------------------------------------------------------------------
| File Activity / Audit Logs
|--------------------------------------------------------------------------
*/

router.get(
    "/activity/logs",
    authenticateToken,
    getActivityLogs
);

/*
|--------------------------------------------------------------------------
| Specific File Activity / Audit Logs
|--------------------------------------------------------------------------
*/

router.get(
    "/:id/activity",
    authenticateToken,
    getFileActivityLogs
);

module.exports = router;
