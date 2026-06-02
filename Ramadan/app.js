// --- GLOBAL VARIABLES ---
let html5QrcodeScanner = null;
let isProcessingScan = false; 
let tempRegData = { id: '', name: '', count: 1 };

// Pre-loaded databases
let masterDB = [];
let registeredDB = [];

// Bootstrap Modal Instances
let registerModalInstance = null;
let issueModalInstance = null;
let issueTimeout = null;

document.addEventListener('DOMContentLoaded', async () => {
    const pageId = document.body.id;

    if (pageId === 'page-home') {
        initDashboard();
    } else if (pageId === 'page-register') {
        await loadMasterDB(); 
        await loadRegisteredDB(); // Load this too to check for duplicates!
        initRegisterPage();
    } else if (pageId === 'page-issue') {
        await loadRegisteredDB();
        initIssuePage();
    }
});

// ==========================================
// DATA LOADING
// ==========================================
async function loadMasterDB() {
    try {
        const res = await fetch('master.json');
        masterDB = await res.json();
    } catch (e) {
        console.error("Could not load master.json");
    }
}

async function loadRegisteredDB() {
    try {
        const res = await fetch('registered.json');
        registeredDB = await res.json();
    } catch (e) {
        console.error("Could not load registered.json");
    }
}

// ==========================================
// 1. DASHBOARD LOGIC
// ==========================================
function initDashboard() {
    let registered = JSON.parse(localStorage.getItem('registered_families')) || {};
    let issuedLogs = JSON.parse(localStorage.getItem('issued_logs')) || {};
    const today = new Date().toISOString().split('T')[0];

    let totalRegistered = Object.keys(registered).length; 
    let todayIssues = issuedLogs[today] ? Object.keys(issuedLogs[today]).length : 0;
    
    let totalPortions = 0;
    if (issuedLogs[today]) {
        for (let key in issuedLogs[today]) {
            totalPortions += issuedLogs[today][key].count;
        }
    }

    document.getElementById('stat-registered').innerText = totalRegistered;
    document.getElementById('stat-issued-today').innerText = todayIssues;
    document.getElementById('stat-portions').innerText = totalPortions;
}

function clearAllData() {
    Swal.fire({
        title: 'Are you sure?',
        text: "This will wipe all registration and issued logs from this device!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Yes, delete it!'
    }).then((result) => {
        if (result.isConfirmed) {
            localStorage.removeItem('registered_families');
            localStorage.removeItem('issued_logs');
            initDashboard(); 
            Swal.fire('Deleted!', 'Local storage has been cleared.', 'success');
        }
    });
}

function clearRegistrations() {
    Swal.fire({
        title: 'Clear pending registrations?',
        text: "Make sure you exported to Excel first!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Yes, clear it!'
    }).then((result) => {
        if (result.isConfirmed) {
            localStorage.removeItem('registered_families');
            Swal.fire('Cleared!', 'Registration storage is empty.', 'success');
        }
    });
}

// ==========================================
// 2. CONTINUOUS SCANNER SETUP
// ==========================================
function setupScanner(onSuccessCallback) {
    const startBtn = document.getElementById('btn-start-scan');
    const stopBtn = document.getElementById('btn-stop-scan');

    startBtn.addEventListener('click', () => {
        html5QrcodeScanner = new Html5Qrcode("qr-reader");
        html5QrcodeScanner.start(
            { facingMode: "environment" },
            { fps: 10, qrbox: { width: 250, height: 250 } },
            (decodedText) => {
                if (isProcessingScan) return; // Prevent spamming
                isProcessingScan = true; 
                onSuccessCallback(decodedText);
            },
            (error) => { /* ignore empty frames silently */ }
        ).catch(err => {
            Swal.fire('Camera Error', 'Make sure you granted camera permissions.', 'error');
        });

        startBtn.classList.add('d-none');
        stopBtn.classList.remove('d-none');
    });

    stopBtn.addEventListener('click', () => {
        if (html5QrcodeScanner) {
            html5QrcodeScanner.stop().then(() => {
                html5QrcodeScanner.clear();
                html5QrcodeScanner = null;
            });
        }
        startBtn.classList.remove('d-none');
        stopBtn.classList.add('d-none');
        isProcessingScan = false;
    });
}

// ==========================================
// 3. REGISTRATION PAGE LOGIC
// ==========================================
function initRegisterPage() {
    setupScanner(handleRegistrationScan);

    // Initialize Modal
    const regModalEl = document.getElementById('registerModal');
    registerModalInstance = new bootstrap.Modal(regModalEl);

    // Whenever modal closes (Save, Cancel, or clicking outside), resume scanning!
    regModalEl.addEventListener('hidden.bs.modal', () => {
        isProcessingScan = false;
    });

    // Setup Numpad clicks
    document.querySelectorAll('.num-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            let num = parseInt(e.target.innerText);
            tempRegData.count = num;
            document.getElementById('reg-count-display').innerText = num;
        });
    });

    // Save button inside modal
    document.getElementById('btn-save-reg').addEventListener('click', () => {
        let registered = JSON.parse(localStorage.getItem('registered_families')) || {};
        registered[tempRegData.id] = {
            id: tempRegData.id,
            name: tempRegData.name,
            count: tempRegData.count
        };
        localStorage.setItem('registered_families', JSON.stringify(registered));

        Swal.fire({
            icon: 'success',
            title: 'Saved!',
            text: `${tempRegData.name} saved.`,
            timer: 1500,
            showConfirmButton: false
        });

        registerModalInstance.hide(); // Hiding modal automatically triggers the 'hidden' event to resume scanning
    });
}

function handleRegistrationScan(qrCode) {
    const person = masterDB.find(p => p.id === qrCode);

    if (!person) {
        Swal.fire({ icon: 'error', title: 'Not Found', text: 'QR Code not in Master List.', timer: 2500, showConfirmButton: false });
        setTimeout(() => { isProcessingScan = false; }, 2500);
        return;
    }

    // CHECK DUPLICATES: Is it in registered.json OR local storage already?
    const alreadyInJSON = registeredDB.find(f => f.id === qrCode);
    const localReg = JSON.parse(localStorage.getItem('registered_families')) || {};
    
    if (alreadyInJSON || localReg[qrCode]) {
        Swal.fire({ icon: 'warning', title: 'Already Registered', text: 'This family is already registered.', timer: 2500, showConfirmButton: false });
        setTimeout(() => { isProcessingScan = false; }, 2500);
        return;
    }

    // Prepare data and show modal
    tempRegData = { id: qrCode, name: person.name, count: 1 };
    document.getElementById('reg-name').innerText = person.name;
    document.getElementById('reg-id').innerText = qrCode;
    document.getElementById('reg-count-display').innerText = '1';
    
    registerModalInstance.show();
}

// ==========================================
// 4. ISSUE PAGE LOGIC (CONTINUOUS SCAN)
// ==========================================
function initIssuePage() {
    setupScanner(handleDistributionScan);
    
    // Initialize Modal
    const issueModalEl = document.getElementById('issueModal');
    issueModalInstance = new bootstrap.Modal(issueModalEl);

    // Resume scanning when success modal closes
    issueModalEl.addEventListener('hidden.bs.modal', () => {
        isProcessingScan = false;
    });
}

function handleDistributionScan(qrCode) {
    let family = registeredDB.find(f => f.id === qrCode);

    if (!family) {
        Swal.fire({ icon: 'error', title: 'Not Registered', text: 'This family is not in registered.json', timer: 2500, showConfirmButton: false });
        setTimeout(() => { isProcessingScan = false; }, 2500);
        return;
    }

    const today = new Date().toISOString().split('T')[0];
    let issuedLogs = JSON.parse(localStorage.getItem('issued_logs')) || {};
    if (!issuedLogs[today]) issuedLogs[today] = {};

    // Block Duplicate Scan today
    if (issuedLogs[today][qrCode]) {
        Swal.fire({ icon: 'warning', title: 'Already Issued!', text: 'They already received porridge today.', timer: 2500, showConfirmButton: false });
        setTimeout(() => { isProcessingScan = false; }, 2500);
        return;
    }

    // Save Issue Record
    issuedLogs[today][qrCode] = {
        name: family.name,
        count: family.count,
        time: new Date().toLocaleTimeString()
    };
    localStorage.setItem('issued_logs', JSON.stringify(issuedLogs));

    // Populate and show the Success Modal
    document.getElementById('dist-name').innerText = family.name;
    document.getElementById('dist-id').innerText = qrCode;
    document.getElementById('dist-count').innerText = family.count;
    
    issueModalInstance.show();

    // Auto close modal after 2.5 seconds (which triggers the hidden event, resuming the scanner)
    clearTimeout(issueTimeout);
    issueTimeout = setTimeout(() => {
        issueModalInstance.hide();
    }, 2500);
}

// ==========================================
// 5. EXPORT TO EXCEL
// ==========================================
function exportExcel(type) {
    if (typeof XLSX === 'undefined') {
        Swal.fire('Error', 'Excel library not loaded. Check internet.', 'error');
        return;
    }

    let dataToExport = [];
    let filename = "";

    if (type === 'registered') {
        let registered = JSON.parse(localStorage.getItem('registered_families')) || {};
        for (let key in registered) {
            dataToExport.push({
                "id": registered[key].id,
                "name": registered[key].name,
                "count": registered[key].count
            });
        }
        filename = "New_Registrations.xlsx";
    } 
    else if (type === 'issued') {
        const today = new Date().toISOString().split('T')[0];
        let issuedLogs = JSON.parse(localStorage.getItem('issued_logs')) || {};
        let todayData = issuedLogs[today] || {};
        
        for (let key in todayData) {
            dataToExport.push({
                "Date": today,
                "Time": todayData[key].time,
                "Membership_Number": key,
                "Name": todayData[key].name,
                "Portions_Issued": todayData[key].count
            });
        }
        filename = `Issued_Logs_${today}.xlsx`;
    }

    if (dataToExport.length === 0) {
        Swal.fire('Empty', 'No data found to export!', 'info');
        return;
    }

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Data");
    XLSX.writeFile(workbook, filename);
}