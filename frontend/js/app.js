// ======================================================
// SECURE BLOCKCHAIN STORAGE - FRONTEND
// ======================================================

const API_BASE = "http://localhost:5000/api";

let token = localStorage.getItem("token");


// ======================================================
// LOGIN
// ======================================================

document
    .getElementById("loginForm")
    .addEventListener("submit", async function (event) {

        event.preventDefault();

        const email =
            document.getElementById("email").value.trim();

        const password =
            document.getElementById("password").value;

        const message =
            document.getElementById("loginMessage");

        message.innerHTML =
            '<div class="alert alert-info">Logging in...</div>';

        try {

            const response = await fetch(
                `${API_BASE}/auth/login`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify({
                        email: email,
                        password: password
                    })
                }
            );

            const data = await response.json();

            if (!response.ok) {

                throw new Error(
                    data.message || "Login failed"
                );

            }

            if (!data.token) {

                throw new Error(
                    "Token was not returned by server"
                );

            }

            // Save JWT token
            token = data.token;

            localStorage.setItem(
                "token",
                token
            );

            message.innerHTML =
                '<div class="alert alert-success">Login successful!</div>';

            // Show dashboard
            showDashboard();

        } catch (error) {

            console.error(
                "Login error:",
                error
            );

            message.innerHTML =
                `
                <div class="alert alert-danger">
                    ${escapeHtml(error.message)}
                </div>
                `;

        }

    });


// ======================================================
// SHOW LOGIN
// ======================================================

function showLogin() {

    const loginSection =
        document.getElementById(
            "loginSection"
        );

    const dashboardSection =
        document.getElementById(
            "dashboardSection"
        );

    if (loginSection) {

        loginSection.classList.remove(
            "d-none"
        );

    }

    if (dashboardSection) {

        dashboardSection.classList.add(
            "d-none"
        );

    }

}


// ======================================================
// SHOW DASHBOARD
// ======================================================

function showDashboard() {

    const loginSection =
        document.getElementById(
            "loginSection"
        );

    const dashboardSection =
        document.getElementById(
            "dashboardSection"
        );

    if (loginSection) {

        loginSection.classList.add(
            "d-none"
        );

    }

    if (dashboardSection) {

        dashboardSection.classList.remove(
            "d-none"
        );

    }

    // Load user's files
    loadFiles();

}


// ======================================================
// LOGOUT
// ======================================================

function logout() {

    localStorage.removeItem(
        "token"
    );

    token = null;

    showLogin();

}


// ======================================================
// FILE UPLOAD
// ======================================================

document
    .getElementById("uploadForm")
    .addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();

            const fileInput =
                document.getElementById(
                    "file"
                );

            const uploadButton =
                document.getElementById(
                    "uploadButton"
                );

            // Check file
            if (
                !fileInput ||
                !fileInput.files ||
                fileInput.files.length === 0
            ) {

                showStatus(
                    "Please select a file.",
                    "warning"
                );

                return;

            }

            // Check login
            if (!token) {

                showStatus(
                    "Please login first.",
                    "danger"
                );

                showLogin();

                return;

            }

            const selectedFile =
                fileInput.files[0];

            const formData =
                new FormData();

            formData.append(
                "file",
                selectedFile
            );

            // Disable button
            uploadButton.disabled = true;

            uploadButton.innerText =
                "Uploading...";

            showStatus(
                "Uploading and securing file...",
                "info"
            );

            try {

                const response =
                    await fetch(
                        `${API_BASE}/files/upload`,
                        {
                            method: "POST",

                            headers: {
                                "Authorization":
                                    `Bearer ${token}`
                            },

                            body: formData
                        }
                    );

                const data =
                    await response.json();

                // Token expired
                if (
                    response.status === 401
                ) {

                    localStorage.removeItem(
                        "token"
                    );

                    token = null;

                    showLogin();

                    throw new Error(
                        "Session expired. Please login again."
                    );

                }

                if (!response.ok) {

                    throw new Error(
                        data.message ||
                        "File upload failed"
                    );

                }

                showStatus(
                    data.message ||
                    "File encrypted, uploaded to IPFS and stored on blockchain successfully",
                    "success"
                );

                // Reset upload form
                document
                    .getElementById(
                        "uploadForm"
                    )
                    .reset();

                // Refresh file list
                await loadFiles();

            } catch (error) {

                console.error(
                    "Upload error:",
                    error
                );

                showStatus(
                    error.message,
                    "danger"
                );

            } finally {

                uploadButton.disabled =
                    false;

                uploadButton.innerText =
                    "🔒 Upload & Secure";

            }

        }
    );


// ======================================================
// LOAD MY FILES
// ======================================================

async function loadFiles() {

    const tableBody =
        document.getElementById(
            "fileTableBody"
        );

    if (!tableBody) {

        console.error(
            "fileTableBody not found"
        );

        return;

    }

    // Loading message
    tableBody.innerHTML =
        `
        <tr>
            <td
                colspan="5"
                class="text-center"
            >
                Loading files...
            </td>
        </tr>
        `;

    // Check token
    if (!token) {

        tableBody.innerHTML =
            `
            <tr>
                <td
                    colspan="5"
                    class="text-center text-danger"
                >
                    Please login first.
                </td>
            </tr>
            `;

        return;

    }

    try {

        const response =
            await fetch(
                `${API_BASE}/files/my-files`,
                {
                    method: "GET",

                    headers: {
                        "Authorization":
                            `Bearer ${token}`
                    }
                }
            );

        const data =
            await response.json();

        console.log(
            "My files API response:",
            data
        );

        // Token invalid
        if (
            response.status === 401
        ) {

            localStorage.removeItem(
                "token"
            );

            token = null;

            showLogin();

            throw new Error(
                "Session expired. Please login again."
            );

        }

        if (!response.ok) {

            throw new Error(
                data.message ||
                "Failed to load files"
            );

        }

        /*
         * IMPORTANT:
         *
         * Backend returns:
         *
         * {
         *   message: "Files retrieved successfully",
         *   files: [...]
         * }
         *
         * So we must use data.files
         */

        const files =
            Array.isArray(data.files)
                ? data.files
                : [];

        // Clear table
        tableBody.innerHTML = "";

        // No files
        if (files.length === 0) {

            tableBody.innerHTML =
                `
                <tr>
                    <td
                        colspan="5"
                        class="text-center"
                    >
                        No files found
                    </td>
                </tr>
                `;

            return;

        }

        // Display files
        files.forEach(
            function (file) {

                const row =
                    document.createElement(
                        "tr"
                    );

                // Database field names
                const fileId =
                    file.id ?? "-";

                const fileName =
                    file.original_name ??
                    file.file_name ??
                    file.fileName ??
                    "-";

                const ipfsCid =
                    file.ipfs_cid ??
                    file.ipfsCid ??
                    "-";

                const timestamp =
                    file.created_at ??
                    file.timestamp ??
                    "-";

                const status =
                    file.upload_status ??
                    file.status ??
                    "Stored";

                row.innerHTML =
                    `
                    <td>
                        ${escapeHtml(fileId)}
                    </td>

                    <td>
                        ${escapeHtml(fileName)}
                    </td>

                    <td>
                        <code>
                            ${escapeHtml(ipfsCid)}
                        </code>
                    </td>

                    <td>
                        ${escapeHtml(timestamp)}
                    </td>

                    <td>
                        <span class="badge bg-success">
                            ${escapeHtml(status)}
                        </span>
                    </td>
                    `;

                tableBody.appendChild(
                    row
                );

            }
        );

    } catch (error) {

        console.error(
            "Load files error:",
            error
        );

        tableBody.innerHTML =
            `
            <tr>
                <td
                    colspan="5"
                    class="text-center text-danger"
                >
                    ${escapeHtml(error.message)}
                </td>
            </tr>
            `;

    }

}


// ======================================================
// STATUS MESSAGE
// ======================================================

function showStatus(
    message,
    type
) {

    const status =
        document.getElementById(
            "statusMessage"
        );

    if (!status) {

        console.error(
            "statusMessage element not found"
        );

        return;

    }

    status.innerHTML =
        `
        <div class="alert alert-${type}">
            ${escapeHtml(message)}
        </div>
        `;

}


// ======================================================
// HTML ESCAPE
// ======================================================

function escapeHtml(value) {

    return String(value)
        .replaceAll(
            "&",
            "&amp;"
        )
        .replaceAll(
            "<",
            "&lt;"
        )
        .replaceAll(
            ">",
            "&gt;"
        )
        .replaceAll(
            '"',
            "&quot;"
        )
        .replaceAll(
            "'",
            "&#039;"
        );

}


// ======================================================
// INITIAL PAGE LOAD
// ======================================================

if (token) {

    showDashboard();

} else {

    showLogin();

}
