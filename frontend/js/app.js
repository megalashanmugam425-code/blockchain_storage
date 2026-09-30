const API_BASE = "/api";

let token = "";
let currentFiles = [];


/* =========================================================
   HELPER
   ========================================================= */

const $ = (id) =>
    document.getElementById(id);


function escapeHtml(value) {

    return String(value ?? "").replace(
        /[&<>'"]/g,
        (ch) => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            "'": "&#39;",
            '"': "&quot;"
        }[ch])
    );
}


function formatBytes(bytes) {

    const n =
        Number(bytes) || 0;

    if (n < 1024) {
        return `${n} B`;
    }

    if (n < 1024 * 1024) {
        return `${(n / 1024).toFixed(2)} KB`;
    }

    if (n < 1024 * 1024 * 1024) {
        return `${(n / 1024 / 1024).toFixed(2)} MB`;
    }

    return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}


function formatDate(value) {

    if (!value) {
        return "—";
    }

    const d =
        new Date(value);

    if (Number.isNaN(d.getTime())) {
        return String(value);
    }

    return d.toLocaleString();
}


/* =========================================================
   MASK IPFS CID
   ========================================================= */

function maskCid(cid) {

    const value =
        String(cid || "");

    if (!value || value === "—") {
        return "—";
    }

    if (value.length <= 18) {
        return value;
    }

    return `${value.slice(0, 12)}...${value.slice(-6)}`;
}


/* =========================================================
   AUTH FORM
   ========================================================= */

function showForm(which) {

    const login =
        $("form-login");

    const register =
        $("form-register");

    const loginTab =
        $("tab-login");

    const registerTab =
        $("tab-register");

    if (!login || !register) {
        return;
    }

    login.classList.toggle(
        "hidden",
        which !== "login"
    );

    register.classList.toggle(
        "hidden",
        which !== "register"
    );

    if (loginTab) {

        loginTab.classList.toggle(
            "active",
            which === "login"
        );
    }

    if (registerTab) {

        registerTab.classList.toggle(
            "active",
            which === "register"
        );
    }

    if (which === "login") {

        $("loginEmail")?.focus();

    } else {

        $("registerFullName")?.focus();
    }
}


function showLogin() {
    showForm("login");
}


function showRegister() {
    showForm("register");
}


/* =========================================================
   PASSWORD STRENGTH
   ========================================================= */

function checkStrength(value) {

    const bar =
        $("strength-bar");

    const label =
        $("strength-label");

    if (!bar || !label) {
        return;
    }

    bar.classList.remove(
        "weak",
        "medium",
        "strong"
    );

    if (!value) {

        label.textContent =
            "Use 8+ characters with a mix of letters & numbers";

        return;
    }

    let score = 0;

    if (value.length >= 8) {
        score++;
    }

    if (/\d/.test(value)) {
        score++;
    }

    if (/[^A-Za-z0-9]/.test(value)) {
        score++;
    }

    if (score <= 1) {

        bar.classList.add("weak");

        label.textContent =
            "Weak — try adding numbers or symbols";

    } else if (score === 2) {

        bar.classList.add("medium");

        label.textContent =
            "Medium — getting there";

    } else {

        bar.classList.add("strong");

        label.textContent =
            "Strong password";
    }
}


/* =========================================================
   MESSAGE
   ========================================================= */

function showMessage(
    id,
    text,
    type = "info"
) {

    const el =
        $(id);

    if (!el) {
        return;
    }

    el.className =
        `form-message ${type}`;

    el.textContent =
        text || "";
}


function showStatus(
    text,
    type = "info"
) {

    const el =
        $("statusMessage");

    if (!el) {
        return;
    }

    el.className =
        `status-message ${type}`;

    el.textContent =
        text || "";
}


/* =========================================================
   AUTH / DASHBOARD VISIBILITY
   ========================================================= */

function setAuthVisible(visible) {

    const auth =
        $("authSection");

    const dashboard =
        $("dashboardSection");

    if (auth) {

        auth.classList.toggle(
            "hidden",
            !visible
        );
    }

    if (dashboard) {

        dashboard.classList.toggle(
            "show",
            !visible
        );
    }
}


/* =========================================================
   PIPELINE
   ========================================================= */

function setPipelineIdle() {

    const fileTag =
        $("pipelineFile");

    if (fileTag) {

        fileTag.textContent =
            "No file selected";
    }

    const steps =
        document.querySelectorAll(
            "#pipeline .p-step"
        );

    steps.forEach(
        (step, index) => {

            step.classList.remove(
                "done",
                "active"
            );

            if (index === 0) {

                step.classList.add(
                    "active"
                );
            }

            const line =
                step.querySelector(
                    ".p-line"
                );

            if (line) {

                line.classList.remove(
                    "done"
                );
            }

            const dot =
                step.querySelector(
                    ".dot"
                );

            if (dot) {

                dot.textContent =
                    String(index + 1);
            }
        }
    );
}


function setPipelineProgress(
    fileName,
    fileSize,
    activeIndex
) {

    const tag =
        $("pipelineFile");

    if (tag) {

        tag.textContent =
            `${fileName} · ${formatBytes(fileSize)}`;
    }

    const steps =
        Array.from(
            document.querySelectorAll(
                "#pipeline .p-step"
            )
        );

    steps.forEach(
        (step, index) => {

            step.classList.toggle(
                "done",
                index < activeIndex
            );

            step.classList.toggle(
                "active",
                index === activeIndex
            );

            const line =
                step.querySelector(
                    ".p-line"
                );

            if (line) {

                line.classList.toggle(
                    "done",
                    index < activeIndex
                );
            }

            const dot =
                step.querySelector(
                    ".dot"
                );

            if (dot) {

                if (
                    index <
                    activeIndex
                ) {

                    dot.textContent =
                        "✓";

                } else {

                    dot.textContent =
                        String(index + 1);
                }
            }
        }
    );
}


/* =========================================================
   JSON
   ========================================================= */

async function readJson(response) {

    const text =
        await response.text();

    try {

        return text
            ? JSON.parse(text)
            : {};

    } catch {

        return {
            message:
                text ||
                `HTTP ${response.status}`
        };
    }
}


/* =========================================================
   LOGIN
   ========================================================= */

async function handleLogin(event) {

    event.preventDefault();

    const email =
        $("loginEmail")
            ?.value
            .trim() || "";

    const password =
        $("loginPassword")
            ?.value || "";

    if (!email || !password) {

        showMessage(
            "loginMessage",
            "Please enter your email and password.",
            "error"
        );

        return;
    }

    const button =
        $("loginButton");

    if (button) {

        button.disabled = true;
        button.textContent = "Signing in…";
    }

    showMessage(
        "loginMessage",
        "Signing in…",
        "info"
    );

    try {

        const response =
            await fetch(
                `${API_BASE}/auth/login`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify({
                            email,
                            password
                        })
                }
            );

        const data =
            await readJson(response);

        if (!response.ok) {

            throw new Error(
                data.message ||
                "Login failed"
            );
        }

        if (!data.token) {

            throw new Error(
                "Token was not returned by server"
            );
        }

        token =
            data.token;

        localStorage.setItem(
            "token",
            token
        );

        showMessage(
            "loginMessage",
            "Login successful.",
            "success"
        );

        window.location.href =
            "./dashboard.html";

    } catch (error) {

        console.error(
            "LOGIN ERROR:",
            error
        );

        showMessage(
            "loginMessage",
            error.message,
            "error"
        );

    } finally {

        if (button) {

            button.disabled = false;
            button.textContent = "Sign in";
        }
    }
}


/* =========================================================
   REGISTER
   ========================================================= */

async function handleRegister(event) {

    event.preventDefault();

    const fullName =
        $("registerFullName")
            ?.value
            .trim() || "";

    const email =
        $("registerEmail")
            ?.value
            .trim() || "";

    const password =
        $("registerPassword")
            ?.value || "";

    const confirm =
        $("registerConfirmPassword")
            ?.value || "";

    if (
        !fullName ||
        !email ||
        !password ||
        !confirm
    ) {

        showMessage(
            "registerMessage",
            "Please fill all fields.",
            "error"
        );

        return;
    }

    if (password !== confirm) {

        showMessage(
            "registerMessage",
            "Passwords do not match.",
            "error"
        );

        return;
    }

    if (password.length < 6) {

        showMessage(
            "registerMessage",
            "Password must be at least 6 characters.",
            "error"
        );

        return;
    }

    const button =
        $("registerButton");

    if (button) {

        button.disabled = true;
        button.textContent = "Creating account…";
    }

    showMessage(
        "registerMessage",
        "Creating account…",
        "info"
    );

    try {

        const response =
            await fetch(
                `${API_BASE}/auth/register`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify({
                            full_name:
                                fullName,
                            email,
                            password
                        })
                }
            );

        const data =
            await readJson(response);

        if (!response.ok) {

            throw new Error(
                data.message ||
                "Registration failed"
            );
        }

        $("form-register")
            ?.reset();

        checkStrength("");

        showForm("login");

        if ($("loginEmail")) {

            $("loginEmail").value =
                email;
        }

        showMessage(
            "loginMessage",
            "Account created successfully. Sign in to continue.",
            "success"
        );

    } catch (error) {

        console.error(
            "REGISTER ERROR:",
            error
        );

        showMessage(
            "registerMessage",
            error.message,
            "error"
        );

    } finally {

        if (button) {

            button.disabled = false;
            button.textContent = "Create account";
        }
    }
}


/* =========================================================
   PASSWORD TOGGLE
   ========================================================= */

function togglePassword(
    input,
    toggle
) {

    if (!input || !toggle) {
        return;
    }

    const isPassword =
        input.type === "password";

    input.type =
        isPassword
            ? "text"
            : "password";

    toggle.textContent =
        isPassword
            ? "hide"
            : "show";
}


/* =========================================================
   LOGOUT
   ========================================================= */

function logout() {

    token = "";
    currentFiles = [];

    localStorage.removeItem(
        "token"
    );

    window.location.href =
        "./index.html";
}


/* =========================================================
   DASHBOARD
   ========================================================= */

async function loadDashboard() {

    if (!token) {

        token =
            localStorage.getItem(
                "token"
            ) || "";
    }

    if (!token) {

        window.location.href =
            "./index.html";

        return;
    }

    if ($("dashboardSection")) {

        $("dashboardSection")
            .classList.add("show");
    }

    showStatus(
        "Loading your stored files…",
        "info"
    );

    try {

        const response =
            await fetch(
                `${API_BASE}/files/my-files`,
                {
                    headers: {
                        Authorization:
                            `Bearer ${token}`
                    }
                }
            );

        const data =
            await readJson(response);

        if (
            response.status === 401 ||
            response.status === 403
        ) {

            token = "";

            localStorage.removeItem(
                "token"
            );

            window.location.href =
                "./index.html";

            return;
        }

        if (!response.ok) {

            throw new Error(
                data.message ||
                "Failed to fetch files"
            );
        }

        currentFiles =
            Array.isArray(data.files)
                ? data.files
                : [];

        renderFiles(
            getFilteredFiles()
        );

        updateStats(
            currentFiles
        );

        renderBars(
            currentFiles
        );

        updatePipelineFromFiles(
            currentFiles
        );

        showStatus(
            "Dashboard connected.",
            "success"
        );

        setTimeout(
            () =>
                showStatus(
                    "",
                    "info"
                ),
            1800
        );

    } catch (error) {

        console.error(
            "DASHBOARD ERROR:",
            error
        );

        showStatus(
            error.message,
            "error"
        );

        renderFiles([]);
        updateStats([]);
        renderBars([]);
        setPipelineIdle();
    }
}


/* =========================================================
   SEARCH & FILTER
   ========================================================= */

function getSearchElement() {

    return (
        $("fileSearch") ||
        $("searchInput") ||
        $("searchFiles")
    );
}


function getFilterElement() {

    return (
        $("fileFilter") ||
        $("statusFilter") ||
        $("filterStatus")
    );
}


function getSearchValue() {

    const input =
        getSearchElement();

    if (!input) {
        return "";
    }

    return String(
        input.value || ""
    )
        .trim()
        .toLowerCase();
}


function getFilterValue() {

    const filter =
        getFilterElement();

    if (!filter) {
        return "all";
    }

    return String(
        filter.value || "all"
    )
        .trim()
        .toLowerCase();
}


function fileMatchesSearch(
    file,
    search
) {

    if (!search) {
        return true;
    }

    const name =
        String(
            file.original_name ||
            file.originalName ||
            file.name ||
            ""
        ).toLowerCase();

    const encryptedName =
        String(
            file.encrypted_name ||
            file.encryptedName ||
            ""
        ).toLowerCase();

    const cid =
        String(
            file.ipfs_cid ||
            file.ipfsCid ||
            ""
        ).toLowerCase();

    const status =
        String(
            file.upload_status ||
            ""
        ).toLowerCase();

    const id =
        String(
            file.id ||
            ""
        ).toLowerCase();

    return (
        name.includes(search) ||
        encryptedName.includes(search) ||
        cid.includes(search) ||
        status.includes(search) ||
        id.includes(search)
    );
}


function fileMatchesFilter(
    file,
    filter
) {

    if (
        !filter ||
        filter === "all" ||
        filter === "all files"
    ) {

        return true;
    }

    const status =
        String(
            file.upload_status ||
            "uploaded"
        ).toLowerCase();

    if (
        filter === "confirmed" ||
        filter === "verified" ||
        filter === "success"
    ) {

        return (
            status.includes("confirm") ||
            status === "uploaded" ||
            status === "verified"
        );
    }

    if (
        filter === "pending" ||
        filter === "pending tx" ||
        filter === "pending confirmation"
    ) {

        return status.includes("pending");
    }

    if (
        filter === "failed" ||
        filter === "failure" ||
        filter === "mismatch"
    ) {

        return (
            status.includes("fail") ||
            status.includes("mismatch")
        );
    }

    if (filter === "encrypted") {

        return status.includes("encrypt");
    }

    return true;
}


function getFilteredFiles() {

    const search =
        getSearchValue();

    const filter =
        getFilterValue();

    return currentFiles.filter(
        (file) =>
            fileMatchesSearch(
                file,
                search
            ) &&
            fileMatchesFilter(
                file,
                filter
            )
    );
}


function applyFileFilter() {

    const filteredFiles =
        getFilteredFiles();

    renderFiles(
        filteredFiles
    );

    updateSearchResultMessage(
        filteredFiles.length
    );
}


function updateSearchResultMessage(count) {

    const search =
        getSearchValue();

    const filter =
        getFilterValue();

    const hasSearch =
        Boolean(search);

    const hasFilter =
        filter &&
        filter !== "all" &&
        filter !== "all files";

    if (!hasSearch && !hasFilter) {
        return;
    }

    const total =
        currentFiles.length;

    if (count === 0) {

        showStatus(
            "No files match your search/filter.",
            "info"
        );

        return;
    }

    showStatus(
        `Showing ${count} of ${total} files.`,
        "info"
    );
}


function clearFileSearch() {

    const search =
        getSearchElement();

    if (search) {
        search.value = "";
    }

    const filter =
        getFilterElement();

    if (filter) {
        filter.value = "all";
    }

    renderFiles(
        currentFiles
    );

    showStatus(
        "",
        "info"
    );
}


function handleSearchKeydown(event) {

    if (event.key === "Escape") {

        clearFileSearch();
        return;
    }

    if (event.key === "Enter") {

        event.preventDefault();
        applyFileFilter();
    }
}


function bindFileSearchFilter() {

    const search =
        getSearchElement();

    if (search) {

        search.addEventListener(
            "input",
            applyFileFilter
        );

        search.addEventListener(
            "keydown",
            handleSearchKeydown
        );
    }

    const filter =
        getFilterElement();

    if (filter) {

        filter.addEventListener(
            "change",
            applyFileFilter
        );
    }

    const clearButton =
        $("clearSearch") ||
        $("clearFileSearch") ||
        $("searchClear");

    if (clearButton) {

        clearButton.addEventListener(
            "click",
            clearFileSearch
        );
    }
}


/* =========================================================
   STATS
   ========================================================= */

function updateStats(files) {

    const total =
        files.length;

    const original =
        files.reduce(
            (sum, file) =>
                sum +
                Number(
                    file.file_size ??
                    file.original_size ??
                    0
                ),
            0
        );

    const compressed =
        files.reduce(
            (sum, file) =>
                sum +
                Number(
                    file.compressed_size ??
                    0
                ),
            0
        );

    const average =
        files.length
            ? files.reduce(
                (sum, file) =>
                    sum +
                    Number(
                        file.compression_ratio ??
                        0
                    ),
                0
            ) / files.length
            : 0;

    const confirmed =
        files.filter(
            (file) => {

                const status =
                    String(
                        file.upload_status ||
                        ""
                    ).toLowerCase();

                return (
                    status.includes("confirm") ||
                    status === "uploaded"
                );
            }
        ).length;

    if ($("statFiles")) {

        $("statFiles").textContent =
            total;
    }

    if ($("statToday")) {

        const today =
            files.filter(
                (file) => {

                    const date =
                        new Date(
                            file.created_at
                        );

                    const now =
                        new Date();

                    return (
                        date.toDateString() ===
                        now.toDateString()
                    );
                }
            ).length;

        $("statToday").textContent =
            `+${today} today`;
    }

    if ($("statStorage")) {

        $("statStorage").textContent =
            formatBytes(original);
    }

    if ($("statCompressed")) {

        $("statCompressed").textContent =
            `${formatBytes(
                compressed
            )} after compression`;
    }

    if ($("statVerified")) {

        $("statVerified").textContent =
            `${confirmed} / ${total}`;
    }

    if ($("statPending")) {

        $("statPending").textContent =
            `${Math.max(
                0,
                total - confirmed
            )} pending confirmation`;
    }

    if ($("statCompression")) {

        $("statCompression").textContent =
            `${average.toFixed(0)}%`;
    }
}


/* =========================================================
   STATUS
   ========================================================= */

function statusClass(status) {

    const value =
        String(status || "")
            .toLowerCase();

    if (
        value.includes("fail") ||
        value.includes("mismatch")
    ) {

        return "mismatch";
    }

    if (
        value.includes("pending")
    ) {

        return "pending";
    }

    return "confirmed";
}


function statusText(status) {

    const value =
        String(
            status || "uploaded"
        );

    const lower =
        value.toLowerCase();

    if (lower.includes("fail")) {

        return "verification failed";
    }

    if (lower.includes("pending")) {

        return "pending tx";
    }

    if (value === "uploaded") {

        return "confirmed";
    }

    return value;
}


/* =========================================================
   FILES
   ========================================================= */

function renderFiles(files) {

    const rows =
        $("rows");

    if (!rows) {
        return;
    }

    if (!files.length) {

        const search =
            getSearchValue();

        const filter =
            getFilterValue();

        const searching =
            Boolean(search) ||
            (
                filter &&
                filter !== "all" &&
                filter !== "all files"
            );

        rows.innerHTML =
            `
            <tr>
                <td
                    colspan="5"
                    class="empty-state"
                >
                    ${
                        searching
                            ? "No files match your search/filter."
                            : "No files stored yet. Upload your first file."
                    }
                </td>
            </tr>
            `;

        return;
    }

    rows.innerHTML =
        files.map(
            (file) => {

                const id =
                    file.id;

                const name =
                    file.original_name ||
                    file.originalName ||
                    file.name ||
                    "Unnamed file";

                const size =
                    Number(
                        file.file_size ??
                        file.original_size ??
                        0
                    );

                const compressed =
                    Number(
                        file.compressed_size ??
                        0
                    );

                const cid =
                    file.ipfs_cid ||
                    file.ipfsCid ||
                    "—";

                const displayCid =
                    maskCid(cid);

                const status =
                    file.upload_status ||
                    "uploaded";

                return `
                <tr>

                    <td>

                        <div class="fname">
                            ${escapeHtml(name)}
                        </div>

                        <div class="fmeta">
                            ID ${escapeHtml(id)}
                            · uploaded
                            ${escapeHtml(
                                formatDate(
                                    file.created_at
                                )
                            )}
                        </div>

                    </td>

                    <td>

                        ${formatBytes(size)}
                        →
                        <span
                            class="${
                                compressed &&
                                compressed < size
                                    ? "comp-good"
                                    : "comp-skip"
                            }"
                        >
                            ${formatBytes(
                                compressed ||
                                size
                            )}

                            ${
                                compressed &&
                                compressed >= size
                                    ? " (compression skipped)"
                                    : ""
                            }

                        </span>

                    </td>

                    <td class="mono cid">

                        ${escapeHtml(displayCid)}

                        <button
                            type="button"
                            onclick="copyCid(
                                '${encodeURIComponent(cid)}',
                                this
                            )"
                        >
                            copy
                        </button>

                    </td>

                    <td>

                        <span
                            class="badge ${statusClass(status)}"
                        >

                            <span class="d"></span>

                            ${escapeHtml(
                                statusText(status)
                            )}

                        </span>

                    </td>

                    <td>

                        <div class="actions">

                            <button
                                class="act-btn verify"
                                type="button"
                                onclick="runVerify(
                                    this,
                                    '${encodeURIComponent(id)}'
                                )"
                            >
                                Verify
                            </button>

                            <button
                                class="act-btn"
                                type="button"
                                onclick="downloadFile(
                                    '${encodeURIComponent(id)}'
                                )"
                            >
                                Download
                            </button>

                            <button
                                class="act-btn"
                                type="button"
                                onclick="showDetails(
                                    '${encodeURIComponent(id)}'
                                )"
                            >
                                Details
                            </button>
                            <button
    class="act-btn delete"
    type="button"
    onclick="deleteFile('${encodeURIComponent(id)}')"
>
    Delete
</button>

                        </div>

                    </td>

                </tr>
                `;
            }
        ).join("");
}


/* =========================================================
   COPY CID
   ========================================================= */

async function copyCid(
    encoded,
    button
) {

    const cid =
        decodeURIComponent(encoded);

    try {

        await navigator.clipboard.writeText(
            cid
        );

        const old =
            button.textContent;

        button.textContent =
            "copied";

        setTimeout(
            () => {
                button.textContent = old;
            },
            900
        );

    } catch {

        showStatus(
            "Could not copy CID.",
            "error"
        );
    }
}


/* =========================================================
   BLOCKCHAIN VERIFY
   ========================================================= */

async function runVerify(
    button,
    encodedId
) {

    if (!button) {
        return;
    }

    if (
        button.classList.contains(
            "checking"
        )
    ) {
        return;
    }

    const id =
        decodeURIComponent(
            encodedId || ""
        );

    if (!id) {

        showStatus(
            "File ID is missing.",
            "error"
        );

        return;
    }

    if (!token) {

        token =
            localStorage.getItem(
                "token"
            ) || "";
    }

    if (!token) {

        window.location.href =
            "./index.html";

        return;
    }

    button.classList.remove(
        "ok",
        "mismatch"
    );

    button.classList.add(
        "checking"
    );

    button.disabled =
        true;

    button.textContent =
        "Checking…";

    showStatus(
        "Verifying file against the blockchain…",
        "info"
    );

    try {

        const response =
            await fetch(
                `${API_BASE}/files/${encodeURIComponent(id)}/verify`,
                {
                    method: "GET",

                    headers: {
                        Authorization:
                            `Bearer ${token}`
                    }
                }
            );

        const data =
            await readJson(response);

        if (
            response.status === 401 ||
            response.status === 403
        ) {

            token = "";

            localStorage.removeItem(
                "token"
            );

            window.location.href =
                "./index.html";

            return;
        }

        if (!response.ok) {

            throw new Error(
                data.message ||
                "Blockchain verification failed"
            );
        }

        if (data.verified === true) {

            button.classList.remove(
                "checking"
            );

            button.classList.add(
                "ok"
            );

            button.textContent =
                "Match";

            showStatus(
                "✓ File verified successfully against the blockchain.",
                "success"
            );

            setTimeout(
                () => {

                    button.classList.remove(
                        "ok"
                    );

                    button.textContent =
                        "Verify";

                },
                1800
            );

        } else {

            button.classList.remove(
                "checking"
            );

            button.textContent =
                "Mismatch";

            button.classList.add(
                "mismatch"
            );

            let reason =
                "Blockchain verification failed.";

            if (
                data.cidMatches === false &&
                data.fileNameMatches === false
            ) {

                reason =
                    "CID and file name do not match the blockchain.";

            } else if (
                data.cidMatches === false
            ) {

                reason =
                    "IPFS CID does not match the blockchain.";

            } else if (
                data.fileNameMatches === false
            ) {

                reason =
                    "File name does not match the blockchain.";
            }

            showStatus(
                reason,
                "error"
            );

            setTimeout(
                () => {

                    button.classList.remove(
                        "mismatch"
                    );

                    button.textContent =
                        "Verify";

                },
                2200
            );
        }

    } catch (error) {

        console.error(
            "BLOCKCHAIN VERIFY ERROR:",
            error
        );

        button.classList.remove(
            "checking"
        );

        button.textContent =
            "Failed";

        button.classList.add(
            "mismatch"
        );

        showStatus(
            error.message ||
            "Blockchain verification failed.",
            "error"
        );

        setTimeout(
            () => {

                button.classList.remove(
                    "mismatch"
                );

                button.textContent =
                    "Verify";

            },
            2200
        );

    } finally {

        button.disabled =
            false;
    }
}


/* =========================================================
   VERIFY ALL FILES - 3 DOT MENU
   ========================================================= */

async function verifyAllFiles() {

    closeDashboardMenu();

    if (!token) {

        token =
            localStorage.getItem(
                "token"
            ) || "";
    }

    if (!token) {

        window.location.href =
            "./index.html";

        return;
    }

    if (!currentFiles.length) {

        showStatus(
            "No files available for verification.",
            "info"
        );

        return;
    }

    showStatus(
        `Verifying ${currentFiles.length} file(s) against blockchain…`,
        "info"
    );

    let verifiedCount = 0;
    let failedCount = 0;

    for (
        const file of currentFiles
    ) {

        try {

            const response =
                await fetch(
                    `${API_BASE}/files/${encodeURIComponent(
                        file.id
                    )}/verify`,
                    {
                        headers: {
                            Authorization:
                                `Bearer ${token}`
                        }
                    }
                );

            const data =
                await readJson(response);

            if (
                response.status === 401 ||
                response.status === 403
            ) {

                token = "";

                localStorage.removeItem(
                    "token"
                );

                window.location.href =
                    "./index.html";

                return;
            }

            if (
                response.ok &&
                data.verified === true
            ) {

                verifiedCount++;

            } else {

                failedCount++;
            }

        } catch {

            failedCount++;
        }
    }

    if (failedCount === 0) {

        showStatus(
            `✓ All ${verifiedCount} file(s) verified successfully.`,
            "success"
        );

    } else {

        showStatus(
            `${verifiedCount} verified, ${failedCount} failed.`,
            "error"
        );
    }
}


/* =========================================================
   DOWNLOAD
   ========================================================= */

async function downloadFile(
    encodedId
) {

    const id =
        decodeURIComponent(encodedId);

    if (!token) {

        window.location.href =
            "./index.html";

        return;
    }

    showStatus(
        "Preparing secure download…",
        "info"
    );

    try {

        const response =
            await fetch(
                `${API_BASE}/files/${encodeURIComponent(id)}/download`,
                {
                    headers: {
                        Authorization:
                            `Bearer ${token}`
                    }
                }
            );

        if (!response.ok) {

            const data =
                await readJson(response);

            throw new Error(
                data.message ||
                "Download failed"
            );
        }

        const blob =
            await response.blob();

        const file =
            currentFiles.find(
                (item) =>
                    String(item.id) ===
                    String(id)
            );

        const name =
            file?.original_name ||
            `file-${id}`;

        const url =
            URL.createObjectURL(blob);

        const link =
            document.createElement("a");

        link.href = url;
        link.download = name;

        document.body.appendChild(link);

        link.click();

        link.remove();

        URL.revokeObjectURL(url);

        showStatus(
            "Download started.",
            "success"
        );

    } catch (error) {

        showStatus(
            error.message,
            "error"
        );
    }
}
/* DELETE FILE */
async function deleteFile(encodedId) {
    const id = decodeURIComponent(encodedId);

    if (!token) {
        token = localStorage.getItem("token") || "";
    }

    if (!token) {
        window.location.href = "./index.html";
        return;
    }

    const file = currentFiles.find(
        item => String(item.id) === String(id)
    );

    const name =
        file?.original_name ||
        file?.originalName ||
        "this file";

    const confirmed = window.confirm(
        `Are you sure you want to delete "${name}"?\n\n` +
        "This file will be hidden from your dashboard.\n" +
        "Blockchain records and IPFS backups will remain."
    );

    if (!confirmed) return;

    showStatus("Deleting file...", "info");

    try {
        const response = await fetch(
            `${API_BASE}/files/${encodeURIComponent(id)}`,
            {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );

        const data = await readJson(response);

        if (response.status === 401 || response.status === 403) {
            token = "";
            localStorage.removeItem("token");
            window.location.href = "./index.html";
            return;
        }

        if (!response.ok) {
            throw new Error(
                data.message || "Failed to delete file"
            );
        }

        showStatus("File deleted successfully.", "success");

        await loadDashboard();

    } catch (error) {
        console.error("DELETE FILE ERROR:", error);

        showStatus(
            error.message || "Failed to delete file.",
            "error"
        );
    }
}


/* =========================================================
   DETAILS
   ========================================================= */

async function showDetails(
    encodedId
) {

    const id =
        decodeURIComponent(encodedId);

    if (!token) {

        window.location.href =
            "./index.html";

        return;
    }

    showStatus(
        "Loading file details…",
        "info"
    );

    try {

        const response =
            await fetch(
                `${API_BASE}/files/${encodeURIComponent(id)}/details`,
                {
                    headers: {
                        Authorization:
                            `Bearer ${token}`
                    }
                }
            );

        const data =
            await readJson(response);

        if (
            response.status === 401 ||
            response.status === 403
        ) {

            token = "";

            localStorage.removeItem(
                "token"
            );

            window.location.href =
                "./index.html";

            return;
        }

        if (!response.ok) {

            throw new Error(
                data.message ||
                "Failed to load details"
            );
        }

        if ($("detailOriginalName")) {

            $("detailOriginalName")
                .textContent =
                data.original_name ||
                "—";
        }

        if ($("detailOriginalSize")) {

            $("detailOriginalSize")
                .textContent =
                formatBytes(
                    data.original_size
                );
        }

        if ($("detailCompressedSize")) {

            $("detailCompressedSize")
                .textContent =
                formatBytes(
                    data.compressed_size
                );
        }

        if ($("detailCompression")) {

            $("detailCompression")
                .textContent =
                `${data.compression_ratio ?? "—"}%`;
        }

        if ($("detailEncryption")) {

            $("detailEncryption")
                .textContent =
                data.encryption ||
                "ChaCha20-Poly1305";
        }

        if ($("detailCID")) {

            $("detailCID")
                .textContent =
                maskCid(
                    data.ipfs_cid
                );
        }

        if ($("detailStatus")) {

            $("detailStatus")
                .textContent =
                data.upload_status ||
                "—";
        }

        if ($("detailCreatedAt")) {

            $("detailCreatedAt")
                .textContent =
                formatDate(
                    data.created_at
                );
        }

        $("fileDetailsModal")
            ?.classList.add("show");

        $("fileDetailsModal")
            ?.setAttribute(
                "aria-hidden",
                "false"
            );

        showStatus("", "info");

    } catch (error) {

        showStatus(
            error.message,
            "error"
        );
    }
}


function closeDetails() {

    $("fileDetailsModal")
        ?.classList.remove("show");

    $("fileDetailsModal")
        ?.setAttribute(
            "aria-hidden",
            "true"
        );
}


/* =========================================================
   FEATURE 4
   ACTIVITY / AUDIT LOG
   ========================================================= */

function activityTypeLabel(type) {

    const value =
        String(type || "")
            .toUpperCase();

    if (value === "FILE_UPLOADED") {
        return "FILE UPLOADED";
    }

    if (value === "FILE_DOWNLOADED") {
        return "FILE DOWNLOADED";
    }

    if (value === "FILE_VERIFIED") {
        return "FILE VERIFIED";
    }

    if (value === "FILE_DELETED") {
        return "FILE DELETED";
    }

    return value
        .replaceAll("_", " ");
}


function renderActivityLogs(
    activities
) {

    const body =
        $("auditBody");

    if (!body) {
        return;
    }

    if (
        !Array.isArray(activities) ||
        activities.length === 0
    ) {

        body.innerHTML =
            `
            <div class="audit-empty">
                No activity recorded yet.
            </div>
            `;

        return;
    }

    body.innerHTML =
        activities.map(
            (activity) => {

                const type =
                    activity.activity_type ||
                    "ACTIVITY";

                const description =
                    activity.activity_description ||
                    "Activity recorded";

                const fileId =
                    activity.file_id;

                const ip =
                    activity.ip_address;

                return `
                <div class="audit-item">

                    <div class="audit-type">
                        ${escapeHtml(
                            activityTypeLabel(type)
                        )}
                    </div>

                    <div>

                        <div class="audit-description">
                            ${escapeHtml(
                                description
                            )}
                        </div>

                        <div class="audit-meta">

                            ${
                                fileId
                                    ? `File ID: ${escapeHtml(fileId)}`
                                    : "System activity"
                            }

                            ·

                            ${escapeHtml(
                                formatDate(
                                    activity.created_at
                                )
                            )}

                            ${
                                ip
                                    ? ` · IP: ${escapeHtml(ip)}`
                                    : ""
                            }

                        </div>

                    </div>

                </div>
                `;
            }
        ).join("");
}


async function loadActivityLogs() {

    if (!token) {

        token =
            localStorage.getItem(
                "token"
            ) || "";
    }

    if (!token) {

        window.location.href =
            "./index.html";

        return;
    }

    const body =
        $("auditBody");

    if (body) {

        body.innerHTML =
            `
            <div class="audit-empty">
                Loading activity...
            </div>
            `;
    }

    try {

        const response =
            await fetch(
                `${API_BASE}/files/activity/logs`,
                {
                    method: "GET",

                    headers: {
                        Authorization:
                            `Bearer ${token}`
                    }
                }
            );

        const data =
            await readJson(response);

        if (
            response.status === 401 ||
            response.status === 403
        ) {

            token = "";

            localStorage.removeItem(
                "token"
            );

            window.location.href =
                "./index.html";

            return;
        }

        if (!response.ok) {

            throw new Error(
                data.message ||
                "Failed to fetch activity logs"
            );
        }

        renderActivityLogs(
            data.activities
        );

    } catch (error) {

        console.error(
            "ACTIVITY LOG ERROR:",
            error
        );

        if (body) {

            body.innerHTML =
                `
                <div class="audit-empty">
                    ${escapeHtml(
                        error.message ||
                        "Failed to load activity log."
                    )}
                </div>
                `;
        }
    }
}


/* =========================================================
   OPEN AUDIT MODAL
   ========================================================= */

function openActivityModal() {

    closeDashboardMenu();

    const modal =
        $("auditModal");

    if (!modal) {
        console.error(
            "auditModal not found"
        );
        return;
    }

    modal.classList.add(
        "show"
    );

    modal.setAttribute(
        "aria-hidden",
        "false"
    );

    loadActivityLogs();
}


function closeActivityModal() {

    const modal =
        $("auditModal");

    if (!modal) {
        return;
    }

    modal.classList.remove(
        "show"
    );

    modal.setAttribute(
        "aria-hidden",
        "true"
    );
}


/* =========================================================
   BACKUP STATUS
   ========================================================= */

function openBackupModal() {

    closeDashboardMenu();

    const modal =
        $("backupModal");

    if (!modal) {
        return;
    }

    modal.classList.add(
        "show"
    );

    modal.setAttribute(
        "aria-hidden",
        "false"
    );
}


function closeBackupModal() {

    const modal =
        $("backupModal");

    if (!modal) {
        return;
    }

    modal.classList.remove(
        "show"
    );

    modal.setAttribute(
        "aria-hidden",
        "true"
    );
}


/* =========================================================
   3-DOT MENU
   ========================================================= */

function openDashboardMenu() {

    const menu =
        $("dashboardMenu");

    const button =
        $("dashboardMenuButton");

    if (!menu) {
        return;
    }

    menu.classList.add(
        "show"
    );

    if (button) {

        button.setAttribute(
            "aria-expanded",
            "true"
        );
    }
}


function closeDashboardMenu() {

    const menu =
        $("dashboardMenu");

    const button =
        $("dashboardMenuButton");

    if (!menu) {
        return;
    }

    menu.classList.remove(
        "show"
    );

    if (button) {

        button.setAttribute(
            "aria-expanded",
            "false"
        );
    }
}


function toggleDashboardMenu() {

    const menu =
        $("dashboardMenu");

    if (!menu) {
        return;
    }

    if (
        menu.classList.contains("show")
    ) {

        closeDashboardMenu();

    } else {

        openDashboardMenu();
    }
}


/* =========================================================
   REFRESH DASHBOARD
   ========================================================= */

async function refreshDashboard() {

    closeDashboardMenu();

    await loadDashboard();

    showStatus(
        "Dashboard refreshed.",
        "success"
    );
}


/* =========================================================
   UPLOAD
   ========================================================= */

async function uploadFile(file) {

    if (!file) {
        return;
    }

    if (!token) {

        token =
            localStorage.getItem(
                "token"
            ) || "";
    }

    if (!token) {

        window.location.href =
            "./index.html";

        return;
    }

    setPipelineProgress(
        file.name,
        file.size,
        0
    );

    showStatus(
        "Uploading original file…",
        "info"
    );

    const form =
        new FormData();

    form.append(
        "file",
        file
    );

    try {

        const response =
            await fetch(
                `${API_BASE}/files/upload`,
                {
                    method: "POST",

                    headers: {
                        Authorization:
                            `Bearer ${token}`
                    },

                    body: form
                }
            );

        const data =
            await readJson(response);

        if (
            response.status === 401 ||
            response.status === 403
        ) {

            token = "";

            localStorage.removeItem(
                "token"
            );

            window.location.href =
                "./index.html";

            return;
        }

        if (!response.ok) {

            throw new Error(
                data.message ||
                "Upload failed"
            );
        }

        setPipelineProgress(
            file.name,
            file.size,
            4
        );

        showStatus(
            "File encrypted, uploaded to IPFS and stored on blockchain.",
            "success"
        );

        await loadDashboard();

    } catch (error) {

        console.error(
            "UPLOAD ERROR:",
            error
        );

        showStatus(
            error.message,
            "error"
        );

        setPipelineProgress(
            file.name,
            file.size,
            0
        );
    }
}


/* =========================================================
   CHART
   ========================================================= */

function renderBars(files) {

    const element =
        $("bars");

    if (!element) {
        return;
    }

    element.innerHTML =
        "";

    const now =
        new Date();

    const values = [];

    for (
        let i = 6;
        i >= 0;
        i--
    ) {

        const date =
            new Date(now);

        date.setDate(
            now.getDate() - i
        );

        values.push({

            label:
                date.toLocaleDateString(
                    undefined,
                    {
                        weekday:
                            "short"
                    }
                ),

            value:
                files.filter(
                    (file) =>
                        new Date(
                            file.created_at
                        ).toDateString() ===
                        date.toDateString()
                ).length
        });
    }

    const max =
        Math.max(
            1,
            ...values.map(
                (item) =>
                    item.value
            )
        );

    values.forEach(
        (item) => {

            const column =
                document.createElement(
                    "div"
                );

            column.className =
                "bar-col";

            column.innerHTML =
                `
                <div
                    class="bar"
                    style="height:${
                        (item.value /
                            max *
                            90) +
                        10
                    }px"
                ></div>

                <div class="d-lbl">
                    ${item.label}
                </div>
                `;

            element.appendChild(
                column
            );
        }
    );
}


/* =========================================================
   PIPELINE
   ========================================================= */

function updatePipelineFromFiles(files) {

    if (!files.length) {

        setPipelineIdle();

        return;
    }

    const file =
        files[0];

    setPipelineProgress(
        file.original_name ||
            "Latest file",

        file.file_size ||
            0,

        5
    );
}


/* =========================================================
   BIND EVENTS
   ========================================================= */

function bind() {

    /* AUTH */

    $("loginForm")
        ?.addEventListener(
            "submit",
            handleLogin
        );


    $("registerForm")
        ?.addEventListener(
            "submit",
            handleRegister
        );


    $("loginPassword")
        ?.parentElement
        ?.querySelector(".toggle")
        ?.addEventListener(
            "click",
            (event) => {

                togglePassword(
                    $("loginPassword"),
                    event.currentTarget
                );
            }
        );


    $("registerPassword")
        ?.parentElement
        ?.querySelector(".toggle")
        ?.addEventListener(
            "click",
            (event) => {

                togglePassword(
                    $("registerPassword"),
                    event.currentTarget
                );
            }
        );


    $("registerConfirmPassword")
        ?.parentElement
        ?.querySelector(".toggle")
        ?.addEventListener(
            "click",
            (event) => {

                togglePassword(
                    $("registerConfirmPassword"),
                    event.currentTarget
                );
            }
        );


    /* LOGOUT */

    $("logoutButton")
        ?.addEventListener(
            "click",
            logout
        );


    $("logoutMenuButton")
        ?.addEventListener(
            "click",
            logout
        );


    /* UPLOAD */

    $("chooseFileButton")
        ?.addEventListener(
            "click",
            () => {

                $("file")?.click();
            }
        );


    $("chooseFileButtonTop")
        ?.addEventListener(
            "click",
            () => {

                $("file")?.click();
            }
        );


    $("file")
        ?.addEventListener(
            "change",
            (event) => {

                const file =
                    event.target
                        .files?.[0];

                if (file) {

                    uploadFile(file);
                }

                event.target.value =
                    "";
            }
        );


    /* DETAILS */

    $("closeDetailsModal")
        ?.addEventListener(
            "click",
            closeDetails
        );


    $("closeDetailsButton")
        ?.addEventListener(
            "click",
            closeDetails
        );


    $("fileDetailsModal")
        ?.addEventListener(
            "click",
            (event) => {

                if (
                    event.target.id ===
                    "fileDetailsModal"
                ) {

                    closeDetails();
                }
            }
        );


    /* =====================================================
       THREE DOT MENU
       ===================================================== */

    const menuButton =
        $("dashboardMenuButton");

    if (menuButton) {

        menuButton.addEventListener(
            "click",
            (event) => {

                event.stopPropagation();

                toggleDashboardMenu();
            }
        );
    }


    /* FILE ACTIVITY */

    const activityButton =
        $("activityMenuButton");

    if (activityButton) {

        activityButton.addEventListener(
            "click",
            (event) => {

                event.preventDefault();
                event.stopPropagation();

                openActivityModal();
            }
        );
    }


    /* BACKUP STATUS */

    const backupButton =
        $("backupMenuButton");

    if (backupButton) {

        backupButton.addEventListener(
            "click",
            (event) => {

                event.preventDefault();
                event.stopPropagation();

                openBackupModal();
            }
        );
    }


    /* VERIFY FILES */

    const verifyButton =
        $("verifyMenuButton");

    if (verifyButton) {

        verifyButton.addEventListener(
            "click",
            (event) => {

                event.preventDefault();
                event.stopPropagation();

                verifyAllFiles();
            }
        );
    }


    /* LOGOUT FROM MENU */

    const logoutMenuButton =
        $("logoutMenuButton");

    if (logoutMenuButton) {

        logoutMenuButton.addEventListener(
            "click",
            (event) => {

                event.preventDefault();
                event.stopPropagation();

                logout();
            }
        );
    }


    /* =====================================================
       AUDIT MODAL
       ===================================================== */

    $("closeAuditModal")
        ?.addEventListener(
            "click",
            closeActivityModal
        );


    $("auditModal")
        ?.addEventListener(
            "click",
            (event) => {

                if (
                    event.target.id ===
                    "auditModal"
                ) {

                    closeActivityModal();
                }
            }
        );


    /* =====================================================
       BACKUP MODAL
       ===================================================== */

    $("closeBackupModal")
        ?.addEventListener(
            "click",
            closeBackupModal
        );


    $("backupModal")
        ?.addEventListener(
            "click",
            (event) => {

                if (
                    event.target.id ===
                    "backupModal"
                ) {

                    closeBackupModal();
                }
            }
        );


    /* =====================================================
       OUTSIDE CLICK
       ===================================================== */

    document.addEventListener(
        "click",
        (event) => {

            const menu =
                $("dashboardMenu");

            const button =
                $("dashboardMenuButton");

            if (!menu) {
                return;
            }

            if (
                menu.contains(event.target) ||
                button?.contains(event.target)
            ) {

                return;
            }

            closeDashboardMenu();
        }
    );


    /* =====================================================
       ESCAPE
       ===================================================== */

    document.addEventListener(
        "keydown",
        (event) => {

            if (
                event.key !== "Escape"
            ) {

                return;
            }

            closeDashboardMenu();

            closeActivityModal();

            closeBackupModal();

            closeDetails();
        }
    );


    /* SEARCH */

    bindFileSearchFilter();
}


/* =========================================================
   PAGE START
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        bind();

        const isDashboardPage =
            Boolean(
                $("dashboardSection")
            );

        const isAuthPage =
            Boolean(
                $("authSection")
            );


        /* AUTH PAGE */

        if (isAuthPage) {

            token =
                localStorage.getItem(
                    "token"
                ) || "";

            setAuthVisible(true);

            showForm("login");

            return;
        }


        /* DASHBOARD PAGE */

        if (isDashboardPage) {

            token =
                localStorage.getItem(
                    "token"
                ) || "";

            $("dashboardSection")
                .classList.add(
                    "show"
                );

            setPipelineIdle();

            loadDashboard();

            return;
        }
    }
);


/* =========================================================
   GLOBAL
   ========================================================= */

window.showForm =
    showForm;

window.showLogin =
    showLogin;

window.showRegister =
    showRegister;

window.checkStrength =
    checkStrength;

window.logout =
    logout;

window.copyCid =
    copyCid;

window.runVerify =
    runVerify;

window.downloadFile =
    downloadFile;
window.deleteFile = deleteFile;
window.showDetails =
    showDetails;

window.applyFileFilter =
    applyFileFilter;

window.clearFileSearch =
    clearFileSearch;

window.loadActivityLogs =
    loadActivityLogs;

window.openActivityModal =
    openActivityModal;

window.closeActivityModal =
    closeActivityModal;

window.openBackupModal =
    openBackupModal;

window.closeBackupModal =
    closeBackupModal;

window.verifyAllFiles =
    verifyAllFiles;

window.refreshDashboard =
    refreshDashboard;

window.openDashboardMenu =
    openDashboardMenu;

window.closeDashboardMenu =
    closeDashboardMenu;

window.toggleDashboardMenu =
    toggleDashboardMenu;
