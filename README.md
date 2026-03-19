# 🕌 Qurbani Distribution Scanner

A mobile-friendly web application for managing Qurbani (and other community) distributions at a Masjid. Members present their QR-coded membership cards and a volunteer scans them to track and issue parcels.

---

## ✨ Features

| Feature | Detail |
|---|---|
| **QR Scanning** | Live camera QR code scanning via jsQR |
| **Contributor Privilege** | Contributors automatically receive extra parcels (configurable) |
| **Manual Lookup** | Type a membership number manually if camera fails |
| **Duplicate Prevention** | Prevents the same member from collecting twice (with override option) |
| **Session History** | Last 50 scans shown with timestamps and parcel count |
| **Distribution Types** | Switch between 🥩 Meat and 🍲 Porridge mode |
| **Live Stats** | Real-time distributed / contributor / parcel counts |
| **Mobile First** | Fully responsive, works on any smartphone |

---

## 📁 File Structure

```
qurbani-scanner/
├── index.html          ← Main app (single-page)
├── data/
│   └── members.json    ← Member & contributor data
└── README.md
```

---

## ⚙️ JSON Data Format

Edit `data/members.json` to manage your members:

```json
{
  "event": {
    "name": "Qurbani Meat Distribution",
    "date": "2026-03-18",
    "location": "Masjid Main Hall",
    "type": "meat"
  },
  "members": [
    "PR/001/1/O/G",
    "PR/061/1/O/G",
    ...
  ],
  "contributors": [
    "PR/001/1/O/G",
    ...
  ]
}
```

- **`members`** — Full list of registered members by membership number
- **`contributors`** — Subset of members who contributed (gets bonus parcels)
- A person in `contributors` **must also be in `members`**

### Membership Number Format
The app accepts any string format. The sample format used is:
```
PR / 061 / 1 / O / G
```

---

## 🚀 Deployment (GitHub Pages)

1. Push this repo to GitHub
2. Go to **Settings → Pages**
3. Set source to `main` branch, `/ (root)` folder
4. Your app will be live at `https://yourusername.github.io/qurbani-scanner/`

> **Note:** GitHub Pages serves over HTTPS which is required for camera access on mobile browsers.

---

## 📱 Usage

1. Open the page on your phone
2. Tap **Start Scanner** and allow camera access
3. Point camera at a member's QR card
4. A popup will show member status and parcel count
5. Tap **Confirm & Give** to record the distribution
6. Tap the ⚙️ settings icon to change distribution type or reset data

---

## 🛠️ Settings

| Setting | Description |
|---|---|
| Distribution Type | Switch between Meat 🥩 and Porridge 🍲 |
| Allow Re-scan | Let already-collected members scan again |
| Contributor Bonus | How many extra parcels contributors get (+1, +2, +3) |
| Reset Data | Clear all session data to start fresh |

---

## 📦 Libraries Used

- [Bootstrap 5.3](https://getbootstrap.com/)
- [Font Awesome 6.5](https://fontawesome.com/)
- [SweetAlert2](https://sweetalert2.github.io/)
- [jsQR](https://github.com/cozmo/jsQR)
- [Google Fonts – Outfit + Scheherazade New](https://fonts.google.com/)

---

## 🔒 Privacy

All data is processed **locally in the browser**. No member data is sent to any server. Scan history is stored in `sessionStorage` and cleared when the browser tab is closed.

---

*Built with ❤️ for community service — بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيم*
