// --- GLOBAL VARIABLES ---
let html5QrcodeScanner = null;
let tempRegData = { id: '', name: '', count: 1 };

document.addEventListener('DOMContentLoaded', () => {
    const pageId = document.body.id;

    if (pageId === 'page-home') {
        initDashboard();
    } else if (pageId === 'page-register') {
        initRegisterPage();
    } else if (pageId === 'page-issue') {
        initIssuePage();
    }
});

// ==========================================
// 1. DASHBOARD LOGIC
// ==========================================
async function initDashboard() {
    let registered = JSON.parse(localStorage.getItem('registered_families')) || {};
    let issuedLogs = JSON.parse(localStorage.getItem('issued_logs')) || {};
    const today = new Date().toISOString().split('T')[0];

    // Combine local storage with registered.json
    try {
        const res = await fetch('registered.json');
        const jsonDb = await res.json();
        jsonDb.forEach(item => {
            if (!registered[item.id]) registered[item.id] = item;
        });
    } catch (e) {
        console.log("No registered.json found or CORS blocked");
    }

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

// ==========================================
// 2. SCANNER UTILITIES
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
                stopScanner();
                onSuccessCallback(decodedText);
            },
            (error) => { /* ignore empty frames */ }
        ).catch(err => {
            Swal.fire('Camera Error', 'Make sure you granted camera permissions.', 'error');
        });

        startBtn.classList.add('d-none');
        stopBtn.classList.remove('d-none');
    });

    stopBtn.addEventListener('click', stopScanner);
}

function stopScanner() {
    if (html5QrcodeScanner) {
        html5QrcodeScanner.stop().then(() => {
            html5QrcodeScanner.clear();
            html5QrcodeScanner = null;
        });
    }
    document.getElementById('btn-start-scan').classList.remove('d-none');
    document.getElementById('btn-stop-scan').classList.add('d-none');
}

// ==========================================
// 3. REGISTRATION PAGE LOGIC
// ==========================================
function initRegisterPage() {
    setupScanner(handleRegistrationScan);

    // Setup Numpad clicks
    document.querySelectorAll('.num-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            let num = parseInt(e.target.innerText);
            tempRegData.count = num;
            document.getElementById('reg-count-display').innerText = num;
        });
    });

    // Save button
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
            text: `${tempRegData.name} saved with ${tempRegData.count} members.`,
            timer: 2000,
            showConfirmButton: false
        });

        document.getElementById('register-details').classList.add('d-none');
    });
}

async function handleRegistrationScan(qrCode) {
    try {
        const response = await fetch('master.json');
        const masterData = await response.json();
        
        // Find by ID
        const person = masterData.find(p => p.id === qrCode);

        if (!person) {
            Swal.fire('Not Found', 'QR Code not found in Master JSON.', 'error');
            return;
        }

        // Display details
        tempRegData = { id: qrCode, name: person.name, count: 1 };
        document.getElementById('reg-name').innerText = person.name;
        document.getElementById('reg-id').innerText = qrCode;
        document.getElementById('reg-count-display').innerText = '1';
        
        document.getElementById('register-details').classList.remove('d-none');

    } catch (error) {
        Swal.fire('Error', 'Could not load master.json. Are you running on a server?', 'error');
    }
}

// ==========================================
// 4. ISSUE PAGE LOGIC
// ==========================================
function initIssuePage() {
    setupScanner(handleDistributionScan);
}

async function handleDistributionScan(qrCode) {
    let family = null;
    
    // 1. Check Local Storage First (Recent registrations)
    let localRegistered = JSON.parse(localStorage.getItem('registered_families')) || {};
    if (localRegistered[qrCode]) {
        family = localRegistered[qrCode];
    } 
    // 2. Check registered.json (Past Excel imports)
    else {
        try {
            const res = await fetch('registered.json');
            const pastData = await res.json();
            family = pastData.find(f => f.id === qrCode);
        } catch(e) {
            console.error("Error loading registered.json");
        }
    }

    if (!family) {
        Swal.fire('Not Registered', 'This family has not been registered.', 'warning');
        return;
    }

    const today = new Date().toISOString().split('T')[0];
    let issuedLogs = JSON.parse(localStorage.getItem('issued_logs')) || {};
    if (!issuedLogs[today]) issuedLogs[today] = {};

    // Block Duplicate Scan
    if (issuedLogs[today][qrCode]) {
        Swal.fire('Already Issued!', 'This family already received porridge today.', 'error');
        return;
    }

    // Save Issue Record
    issuedLogs[today][qrCode] = {
        name: family.name,
        count: family.count,
        time: new Date().toLocaleTimeString()
    };
    localStorage.setItem('issued_logs', JSON.stringify(issuedLogs));

    // Show Success UI
    document.getElementById('dist-name').innerText = family.name;
    document.getElementById('dist-id').innerText = qrCode;
    document.getElementById('dist-count').innerText = family.count;
    document.getElementById('issue-details').classList.remove('d-none');

    Swal.fire({
        icon: 'success',
        title: 'Issued!',
        text: 'Porridge issued successfully.',
        timer: 1500,
        showConfirmButton: false
    });
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
                "Membership_Number": registered[key].id,
                "Name": registered[key].name,
                "Family_Count": registered[key].count
            });
        }
        filename = "Registered_Families.xlsx";
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
        Swal.fire('Empty', 'No data to export!', 'info');
        return;
    }

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Data");
    XLSX.writeFile(workbook, filename);
}