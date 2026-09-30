const FileActivity =
    require("../models/fileActivityModel");


/*
|--------------------------------------------------------------------------
| Get All File Activity Logs
|--------------------------------------------------------------------------
*/

exports.getActivityLogs = async (
    req,
    res
) => {

    try {

        const userId =
            req.user.id;


        const activities =
            await FileActivity.findByUserId(
                userId
            );


        return res.status(200).json({

            activities

        });

    }

    catch (error) {

        console.error(
            "Get activity logs error:",
            error
        );


        return res.status(500).json({

            message:
                "Failed to fetch activity logs",

            error:
                error.message

        });

    }

};


/*
|--------------------------------------------------------------------------
| Get Activity Logs For Specific File
|--------------------------------------------------------------------------
*/

exports.getFileActivityLogs = async (
    req,
    res
) => {

    try {

        const fileId =
            req.params.id;

        const userId =
            req.user.id;


        if (!fileId) {

            return res.status(400).json({

                message:
                    "File ID is required"

            });

        }


        const activities =
            await FileActivity.findByFileId(
                fileId,
                userId
            );


        return res.status(200).json({

            activities

        });

    }

    catch (error) {

        console.error(
            "Get file activity logs error:",
            error
        );


        return res.status(500).json({

            message:
                "Failed to fetch file activity logs",

            error:
                error.message

        });

    }

};
