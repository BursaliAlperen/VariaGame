// ==================== OYUN VERİLERİ (SADECE DİK MOD OYUNLAR - GERÇEK İKONLAR) ====================
const GAMES = [
    { id: 1, name: "2048", category: "bulmaca", icon: "fa-th", iconColor: "#FF9F0A", embed: "https://www.crazygames.com/embed/2048", rating: 4.8, plays: "2.3M", orientation: "portrait" },
    { id: 2, name: "Sudoku", category: "bulmaca", icon: "fa-puzzle-piece", iconColor: "#5856D6", embed: "https://www.crazygames.com/embed/sudoku", rating: 4.7, plays: "1.8M", orientation: "portrait" },
    { id: 3, name: "Solitaire", category: "kart", icon: "fa-club", iconColor: "#34C759", embed: "https://www.crazygames.com/embed/solitaire", rating: 4.6, plays: "3.2M", orientation: "portrait" },
    { id: 4, name: "Mahjong Connect", category: "bulmaca", icon: "fa-border-all", iconColor: "#AF52DE", embed: "https://www.crazygames.com/embed/mahjong-connect", rating: 4.5, plays: "1.2M", orientation: "portrait" },
    { id: 5, name: "Word Search", category: "kelime", icon: "fa-search", iconColor: "#007AFF", embed: "https://www.crazygames.com/embed/word-search", rating: 4.4, plays: "987K", orientation: "portrait" },
    { id: 6, name: "Bubble Shooter", category: "bulmaca", icon: "fa-circle", iconColor: "#FF3B30", embed: "https://www.crazygames.com/embed/bubble-shooter", rating: 4.6, plays: "5.1M", orientation: "portrait" },
    { id: 7, name: "Tower Defense", category: "strateji", icon: "fa-castle", iconColor: "#FF9500", embed: "https://www.crazygames.com/embed/tower-defense", rating: 4.5, plays: "2.5M", orientation: "portrait" },
    { id: 8, name: "Sniper Shot", category: "aksiyon", icon: "fa-crosshairs", iconColor: "#FF2D55", embed: "https://www.crazygames.com/embed/sniper-shot", rating: 4.3, plays: "1.5M", orientation: "portrait" },
    { id: 9, name: "Penalty Kick", category: "spor", icon: "fa-futbol", iconColor: "#4CD964", embed: "https://www.crazygames.com/embed/penalty-kick", rating: 4.4, plays: "3.8M", orientation: "portrait" },
    { id: 10, name: "Parking Master", category: "yaris", icon: "fa-car", iconColor: "#5E5CE6", embed: "https://www.crazygames.com/embed/parking-master", rating: 4.2, plays: "2.1M", orientation: "portrait" },
    { id: 11, name: "Fruit Ninja", category: "aksiyon", icon: "fa-apple-alt", iconColor: "#FF3B30", embed: "https://www.crazygames.com/embed/fruit-ninja", rating: 4.7, plays: "8.2M", orientation: "portrait" },
    { id: 12, name: "Temple Run", category: "aksiyon", icon: "fa-running", iconColor: "#FF9500", embed: "https://www.crazygames.com/embed/temple-run", rating: 4.6, plays: "12.5M", orientation: "portrait" },
    { id: 13, name: "Subway Surfers", category: "aksiyon", icon: "fa-subway", iconColor: "#34C759", embed: "https://www.crazygames.com/embed/subway-surfers", rating: 4.8, plays: "15.2M", orientation: "portrait" },
    { id: 14, name: "Helix Jump", category: "aksiyon", icon: "fa-chart-line", iconColor: "#5856D6", embed: "https://www.crazygames.com/embed/helix-jump", rating: 4.4, plays: "6.7M", orientation: "portrait" },
    { id: 15, name: "Water Sort Puzzle", category: "bulmaca", icon: "fa-tint", iconColor: "#007AFF", embed: "https://www.crazygames.com/embed/water-sort-puzzle", rating: 4.5, plays: "3.4M", orientation: "portrait" },
    { id: 16, name: "Paper.io 2", category: "strateji", icon: "fa-file", iconColor: "#AF52DE", embed: "https://www.crazygames.com/embed/paper-io-2", rating: 4.3, plays: "4.2M", orientation: "portrait" },
    { id: 17, name: "Cut the Rope", category: "bulmaca", icon: "fa-cut", iconColor: "#FF9F0A", embed: "https://www.crazygames.com/embed/cut-the-rope", rating: 4.7, plays: "9.8M", orientation: "portrait" },
    { id: 18, name: "Stack Balls", category: "aksiyon", icon: "fa-layer-group", iconColor: "#FF2D55", embed: "https://www.crazygames.com/embed/stack-balls", rating: 4.2, plays: "1.9M", orientation: "portrait" },
    { id: 19, name: "Idle Miner", category: "strateji", icon: "fa-hammer", iconColor: "#FF9500", embed: "https://www.crazygames.com/embed/idle-miner-tycoon", rating: 4.3, plays: "2.8M", orientation: "portrait" },
    { id: 20, name: "Crossword", category: "kelime", icon: "fa-pen", iconColor: "#5856D6", embed: "https://www.crazygames.com/embed/crossword", rating: 4.4, plays: "876K", orientation: "portrait" },
    { id: 21, name: "Nonogram", category: "bulmaca", icon: "fa-th-large", iconColor: "#34C759", embed: "https://www.crazygames.com/embed/nonogram", rating: 4.5, plays: "654K", orientation: "portrait" },
    { id: 22, name: "Merge Dragons", category: "strateji", icon: "fa-dragon", iconColor: "#AF52DE", embed: "https://www.crazygames.com/embed/merge-dragons", rating: 4.6, plays: "5.4M", orientation: "portrait" }
];

// Kategoriler
const CATEGORIES = [
    { id: "all", name: "Tümü", icon: "fa-grid-2" },
    { id: "bulmaca", name: "Bulmaca", icon: "fa-puzzle-piece" },
    { id: "aksiyon", name: "Aksiyon", icon: "fa-bolt" },
    { id: "strateji", name: "Strateji", icon: "fa-chess" },
    { id: "spor", name: "Spor", icon: "fa-futbol" },
    { id: "yaris", name: "Yarış", icon: "fa-flag-checkered" },
    { id: "kelime", name: "Kelime", icon: "fa-font" },
    { id: "kart", name: "Kart", icon: "fa-club" }
];

// Öne Çıkan Oyunlar (Ana sayfa için)
const FEATURED_GAMES = GAMES.slice(0, 4);

// ==================== DEĞİŞKENLER ====================
let userData = {
    name: "Varia",
    username: "varia",
    level: 1,
    xp: 0,
    balance: 5.00,
    totalEarned: 892,
    totalGames: 47,
    totalMinutes: 0,
    referralCount: 0,
    referralLink: "https://t.me/VariaGameBot?start=ref_12345",
    friends: [],
    streak: 3,
    lastClaim: null,
    dailyAmount: 2.50,
    settings: {
        notifications: true,
        sound: false,
        vibration: true,
        autoPlay: true
    }
};

let currentPage = "home";
let currentTab = "Tümü";
let weeklyChart, monthlyChart;

// ==================== OYUN İKONLARI ====================
function getGameIcon(iconName) {
    return `<i class="fas ${iconName}"></i>`;
}

// ==================== OYUNLARI RENDER ET ====================
function renderGames(filter = "all", search = "") {
    const container = document.getElementById("allGamesList");
    if (!container) return;
    
    let filtered = [...GAMES];
    
    if (filter !== "all") {
        filtered = filtered.filter(g => g.category === filter);
    }
    
    if (search) {
        filtered = filtered.filter(g => g.name.toLowerCase().includes(search.toLowerCase()));
    }
    
    if (filtered.length === 0) {
        container.innerHTML = `<div style="text-align: center; padding: 40px; color: #8E8E93;">
            <i class="fas fa-search" style="font-size: 3rem; margin-bottom: 10px;"></i>
            <p>Oyun bulunamadı</p>
        </div>`;
        return;
    }
    
    container.innerHTML = filtered.map(game => `
        <div class="game-item" onclick="openGame('${game.embed}', '${game.name}')">
            <div class="game-icon" style="background: linear-gradient(135deg, ${game.iconColor}20, ${game.iconColor}40);">
                <i class="fas ${game.icon}" style="color: ${game.iconColor}; font-size: 1.5rem;"></i>
            </div>
            <div class="game-content">
                <div class="game-name">${game.name}</div>
                <div class="game-meta">
                    <span><i class="fas fa-star" style="color: #FF9F0A;"></i> ${game.rating}</span>
                    <span style="margin-left: 8px;"><i class="fas fa-play"></i> ${game.plays}</span>
                    <span style="margin-left: 8px;"><i class="fas fa-mobile-alt"></i> Dik</span>
                </div>
            </div>
            <i class="fas fa-play-circle" style="color: #007AFF; font-size: 1.2rem;"></i>
        </div>
    `).join("");
}

// Öne Çıkan Oyunları Render Et
function renderFeaturedGames() {
    const container = document.getElementById("featuredGames");
    if (!container) return;
    
    container.innerHTML = FEATURED_GAMES.map(game => `
        <div class="game-card" onclick="openGame('${game.embed}', '${game.name}')">
            <div class="game-icon" style="background: linear-gradient(135deg, ${game.iconColor}20, ${game.iconColor}40);">
                <i class="fas ${game.icon}" style="color: ${game.iconColor}; font-size: 1.8rem;"></i>
            </div>
            <h4>${game.name}</h4>
            <p><i class="fas fa-star" style="color: #FF9F0A;"></i> ${game.rating}</p>
        </div>
    `).join("");
}

// Kategorileri Render Et
function renderCategories() {
    const container = document.getElementById("tabsContainer");
    if (!container) return;
    
    container.innerHTML = CATEGORIES.map(cat => `
        <button class="tab-item ${currentTab === cat.name ? 'active' : ''}" data-tab="${cat.name}" onclick="switchTab('${cat.name}')">
            <i class="fas ${cat.icon}" style="margin-right: 4px;"></i> ${cat.name}
        </button>
    `).join("");
}

// ==================== OYUN AÇ/KAPAT ====================
function openGame(embedUrl, gameName) {
    const modal = document.getElementById("gameModal");
    const iframe = document.getElementById("gameIframe");
    const title = document.getElementById("modalGameTitle");
    
    title.textContent = gameName;
    iframe.src = embedUrl;
    modal.style.display = "flex";
    
    // Ekran yönü kontrolü
    if (window.innerWidth > window.innerHeight) {
        document.getElementById("rotateWarning").style.display = "flex";
    } else {
        document.getElementById("rotateWarning").style.display = "none";
    }
    
    document.body.style.overflow = "hidden";
    
    // Kazanç başlat
    startEarning();
}

function closeGameModal() {
    const modal = document.getElementById("gameModal");
    const iframe = document.getElementById("gameIframe");
    
    modal.style.display = "none";
    iframe.src = "";
    document.body.style.overflow = "";
    
    // Rotate uyarısını gizle
    const warning = document.getElementById("rotateWarning");
    if (warning) warning.style.display = "none";
    
    // Kazancı durdur
    stopEarning();
}

// ==================== KAZANÇ SİSTEMİ ====================
let earningInterval = null;
let currentEarning = 0;

function startEarning() {
    if (earningInterval) clearInterval(interval);
    
    earningInterval = setInterval(() => {
        const earningRate = 0.0025;
        currentEarning += earningRate;
        
        const banner = document.getElementById("earningBanner");
        const amountSpan = document.getElementById("earningAmount");
        
        if (banner && amountSpan) {
            banner.classList.add("active");
            amountSpan.textContent = `+$${currentEarning.toFixed(4)}`;
            
            setTimeout(() => {
                banner.classList.remove("active");
            }, 2000);
        }
        
        // XP ve bakiye güncelle
        userData.balance += earningRate;
        userData.xp += 1;
        userData.totalMinutes++;
        
        updateUI();
        
    }, 60000); // Her dakika
}

function stopEarning() {
    if (earningInterval) {
        clearInterval(earningInterval);
        earningInterval = null;
    }
    currentEarning = 0;
}

// ==================== GÜNLÜK ÖDÜL ====================
function claimDaily() {
    const today = new Date().toDateString();
    if (userData.lastClaim === today) {
        alert("Bugün zaten ödülünü aldın! Yarın tekrar dene.");
        return;
    }
    
    userData.balance += userData.dailyAmount;
    userData.lastClaim = today;
    userData.streak = (userData.streak % 7) + 1;
    
    if (userData.streak === 1) {
        userData.dailyAmount = 2.50;
    } else if (userData.streak <= 3) {
        userData.dailyAmount = 3.00;
    } else if (userData.streak <= 6) {
        userData.dailyAmount = 5.00;
    } else {
        userData.dailyAmount = 10.00;
    }
    
    updateUI();
    renderStreak();
    alert(`🎉 Tebrikler! $${userData.dailyAmount.toFixed(2)} kazandın!`);
}

function renderStreak() {
    const container = document.getElementById("streakTracker");
    if (!container) return;
    
    const days = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];
    
    container.innerHTML = days.map((day, i) => {
        const dayNum = i + 1;
        let status = "";
        if (dayNum < userData.streak) status = "completed";
        else if (dayNum === userData.streak) status = "current";
        
        return `
            <div class="streak-day ${status}">
                <div class="day-circle">${dayNum}</div>
                <span>${day}</span>
            </div>
        `;
    }).join("");
}

// ==================== REFERANS SİSTEMİ ====================
function copyReferralLink() {
    navigator.clipboard.writeText(userData.referralLink);
    alert("Referans linki kopyalandı!");
}

// ==================== FİLTRELEME ====================
function filterGames() {
    const searchInput = document.getElementById("searchInput");
    const searchTerm = searchInput ? searchInput.value : "";
    renderGames(currentTab === "Tümü" ? "all" : currentTab.toLowerCase(), searchTerm);
}

function switchTab(tabName) {
    currentTab = tabName;
    renderCategories();
    
    if (currentPage === "games") {
        renderGames(tabName === "Tümü" ? "all" : tabName.toLowerCase(), "");
    }
}

// ==================== SAYFA GEÇİŞLERİ ====================
function switchPage(page) {
    currentPage = page;
    
    document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
    document.getElementById(`${page}Page`).classList.add("active");
    
    document.querySelectorAll(".nav-item").forEach(nav => nav.classList.remove("active"));
    document.querySelector(`.nav-item[data-page="${page}"]`).classList.add("active");
    
    const titles = {
        home: "Oyunlar",
        games: "Tüm Oyunlar",
        referral: "Referans",
        profile: "Profil"
    };
    
    const titleEl = document.getElementById("pageTitle");
    if (titleEl) titleEl.textContent = titles[page] || "VARİA";
    
    if (page === "games") {
        renderGames(currentTab === "Tümü" ? "all" : currentTab.toLowerCase(), "");
    } else if (page === "home") {
        renderFeaturedGames();
        renderStreak();
    } else if (page === "referral") {
        renderReferral();
    } else if (page === "profile") {
        renderProfile();
    }
}

function renderReferral() {
    const countEl = document.getElementById("referralCount");
    const progressEl = document.getElementById("referralProgress");
    const friendListEl = document.getElementById("friendList");
    
    if (countEl) countEl.textContent = `${userData.referralCount}/10`;
    if (progressEl) progressEl.style.width = `${(userData.referralCount / 10) * 100}%`;
    
    if (friendListEl) {
        if (userData.friends.length === 0) {
            friendListEl.innerHTML = `<div style="text-align: center; padding: 20px; color: #8E8E93;">
                <i class="fas fa-users" style="font-size: 2rem; margin-bottom: 10px;"></i>
                <p>Henüz arkadaşın yok</p>
                <p style="font-size: 0.8rem;">Linkini paylaşarak arkadaşlarını davet et!</p>
            </div>`;
        } else {
            friendListEl.innerHTML = userData.friends.map(f => `
                <div class="friend-item">
                    <div class="friend-info">
                        <div class="friend-avatar">${f.name.charAt(0)}</div>
                        <div><strong>${f.name}</strong><br><small style="color: #8E8E93;">${f.date}</small></div>
                    </div>
                    <div class="friend-earning">+$${f.earned}</div>
                </div>
            `).join("");
        }
    }
}

function renderProfile() {
    const totalEarnedEl = document.getElementById("totalEarned");
    const totalGamesEl = document.getElementById("totalGames");
    const totalMinutesEl = document.getElementById("totalMinutes");
    const profileLevelEl = document.getElementById("profileLevel");
    const profileXpEl = document.getElementById("profileXp");
    
    if (totalEarnedEl) totalEarnedEl.textContent = `$${userData.totalEarned}`;
    if (totalGamesEl) totalGamesEl.textContent = userData.totalGames;
    if (totalMinutesEl) totalMinutesEl.textContent = userData.totalMinutes;
    if (profileLevelEl) profileLevelEl.textContent = userData.level;
    if (profileXpEl) profileXpEl.textContent = userData.xp;
}

// ==================== AYARLAR ====================
function toggleSetting(setting) {
    const toggle = document.getElementById(`toggle${setting.charAt(0).toUpperCase() + setting.slice(1)}`);
    userData.settings[setting] = !userData.settings[setting];
    
    if (toggle) {
        if (userData.settings[setting]) {
            toggle.classList.add("active");
        } else {
            toggle.classList.remove("active");
        }
    }
}

// ==================== MODALLAR ====================
function openModal(modalId) {
    document.getElementById(modalId).classList.add("active");
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove("active");
}

function openFilterModal() {
    alert("Filtreleme özelliği yakında!");
}

function openStatsModal() {
    alert("Detaylı istatistikler yakında!");
}

function openStreakInfo() {
    alert("🔥 Günlük streak'in ne kadar yüksek olursa, ödüllerin o kadar büyür! Her gün giriş yapmayı unutma!");
}

function openBalanceDetails() {
    alert(`💰 Güncel Bakiye: $${userData.balance.toFixed(2)}\n\nToplam Kazanç: $${userData.totalEarned}\n\nOyun oynayarak kazanmaya devam et!`);
}

function openHelpModal() {
    alert("📖 Yardım\n\n- Oyun oynayarak XP ve para kazan\n- Her dakika otomatik kazanç\n- Arkadaşlarını davet et, %10 kazan\n- Günlük ödülleri topla\n- Dik mod oyunlar telefon için optimize edilmiştir");
}

function shareApp() {
    if (navigator.share) {
        navigator.share({
            title: "VARİA GAME",
            text: "Oyun oynayarak para kazan!",
            url: userData.referralLink
        });
    } else {
        copyReferralLink();
    }
}

function playRecommendedGame() {
    const randomGame = GAMES[Math.floor(Math.random() * GAMES.length)];
    openGame(randomGame.embed, randomGame.name);
}

// ==================== GRAFİKLER ====================
function initCharts() {
    const weeklyCtx = document.getElementById("weeklyChart")?.getContext("2d");
    const monthlyCtx = document.getElementById("monthlyChart")?.getContext("2d");
    
    if (weeklyCtx) {
        weeklyChart = new Chart(weeklyCtx, {
            type: 'line',
            data: {
                labels: ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'],
                datasets: [{
                    data: [12, 19, 15, 25, 22, 35, 42],
                    borderColor: '#5856D6',
                    backgroundColor: 'rgba(88,86,214,0.1)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 3,
                    pointBackgroundColor: '#5856D6'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } }
            }
        });
    }
    
    if (monthlyCtx) {
        monthlyChart = new Chart(monthlyCtx, {
            type: 'bar',
            data: {
                labels: ['1.Hf', '2.Hf', '3.Hf', '4.Hf'],
                datasets: [{
                    data: [125, 180, 210, 275],
                    backgroundColor: 'rgba(88,86,214,0.7)',
                    borderRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } }
            }
        });
    }
}

// ==================== UI GÜNCELLEME ====================
function updateUI() {
    const balanceEl = document.getElementById("balanceDisplay");
    const userLevelEl = document.getElementById("userLevel");
    const currentXpEl = document.getElementById("currentXp");
    const xpToNextEl = document.getElementById("xpToNextLevel");
    const xpFillEl = document.getElementById("xpFill");
    const referralCountEl = document.getElementById("referralCountDisplay");
    const dailyAmountEl = document.getElementById("dailyAmount");
    
    if (balanceEl) balanceEl.textContent = userData.balance.toFixed(2);
    if (userLevelEl) userLevelEl.textContent = userData.level;
    if (currentXpEl) currentXpEl.textContent = userData.xp;
    if (xpToNextEl) xpToNextEl.textContent = userData.level * 100;
    if (xpFillEl) xpFillEl.style.width = `${(userData.xp / (userData.level * 100)) * 100}%`;
    if (referralCountEl) referralCountEl.textContent = userData.referralCount;
    if (dailyAmountEl) dailyAmountEl.textContent = userData.dailyAmount.toFixed(2);
}

// ==================== ONBOARDING ====================
let currentStep = 1;
let userAge = null;
let userGenres = [];
let userFrequency = null;

function nextOnboardingStep(step) {
    document.querySelector(`.onboarding-step[data-step="${currentStep}"]`).classList.remove("active");
    currentStep = step;
    document.querySelector(`.onboarding-step[data-step="${currentStep}"]`).classList.add("active");
    
    document.querySelectorAll(".dot").forEach((dot, i) => {
        dot.classList.remove("active", "completed");
        if (i < currentStep - 1) dot.classList.add("completed");
        else if (i === currentStep - 1) dot.classList.add("active");
    });
}

function completeOnboarding() {
    document.getElementById("onboarding").style.display = "none";
    document.getElementById("mainApp").classList.add("active");
    
    // Telegram WebApp'i başlat
    if (window.Telegram && window.Telegram.WebApp) {
        window.Telegram.WebApp.ready();
        window.Telegram.WebApp.expand();
        
        const user = window.Telegram.WebApp.initDataUnsafe?.user;
        if (user) {
            userData.name = user.first_name || user.username || "Varia";
            userData.username = user.username || "varia";
            document.getElementById("userName").textContent = userData.name;
            document.getElementById("userUsername").textContent = `@${userData.username}`;
            document.getElementById("userAvatar").textContent = userData.name.charAt(0);
            document.getElementById("profileAvatar").textContent = userData.name.charAt(0);
            document.getElementById("profileName").textContent = userData.name;
        }
    }
    
    renderCategories();
    renderFeaturedGames();
    renderGames();
    renderStreak();
    initCharts();
    updateUI();
}

// ==================== ONBOARDING SEÇİMLER ====================
document.querySelectorAll("[data-age]").forEach(btn => {
    btn.addEventListener("click", function() {
        document.querySelectorAll("[data-age]").forEach(b => b.classList.remove("active"));
        this.classList.add("active");
        userAge = this.dataset.age;
    });
});

document.querySelectorAll("[data-genre]").forEach(btn => {
    btn.addEventListener("click", function() {
        this.classList.toggle("active");
        const genre = this.dataset.genre;
        if (userGenres.includes(genre)) {
            userGenres = userGenres.filter(g => g !== genre);
        } else {
            userGenres.push(genre);
        }
    });
});

document.querySelectorAll("[data-frequency]").forEach(btn => {
    btn.addEventListener("click", function() {
        document.querySelectorAll("[data-frequency]").forEach(b => b.classList.remove("active"));
        this.classList.add("active");
        userFrequency = this.dataset.frequency;
    });
});

// ==================== EKRAN YÖNÜ KONTROLÜ ====================
function checkOrientation() {
    const warning = document.getElementById("rotateWarning");
    if (!warning) return;
    
    if (window.innerWidth > window.innerHeight) {
        warning.style.display = "flex";
    } else {
        warning.style.display = "none";
    }
}

window.addEventListener("resize", checkOrientation);
window.addEventListener("orientationchange", checkOrientation);

// ==================== BAŞLANGIÇ ====================
document.addEventListener("DOMContentLoaded", () => {
    renderCategories();
    renderFeaturedGames();
    renderStreak();
    initCharts();
    updateUI();
    checkOrientation();
});
