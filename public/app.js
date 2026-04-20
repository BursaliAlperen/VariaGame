const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();

let userData = {
    balance: 5.00, streak: 2, dailyClaimed: false,
    totalEarned: 5.00, gamesPlayed: 0, totalMinutes: 0,
    xp: 45, level: 1, xpToNextLevel: 100,
    referrals: 3, settings: { notifications: true, sound: true, vibration: true, autoPlay: true }
};

let onboardingData = { age: null, genres: [], frequency: null };
let recommendedGame = { id: 'moto-x3m', name: 'Moto X3M' };
let gameStartTime = null, earningInterval = null, weeklyChart, monthlyChart;
let currentTab = 'Tümü';

const oyunlar = [
    { ad: "Moto X3M", kategori: "Yarış", ikon: "fa-motorcycle", puan: 4.8, oynanma: "2.3M", embed: "moto-x3m" },
    { ad: "Stickman", kategori: "Aksiyon", ikon: "fa-user-ninja", puan: 4.7, oynanma: "1.8M", embed: "stickman" },
    { ad: "Cut Rope", kategori: "Bulmaca", ikon: "fa-candy-cane", puan: 4.9, oynanma: "3.1M", embed: "cut-rope" },
    { ad: "Archery", kategori: "Aksiyon", ikon: "fa-bow-arrow", puan: 4.6, oynanma: "1.2M", embed: "archery" },
    { ad: "Temple Run", kategori: "Koşu", ikon: "fa-person-running", puan: 4.8, oynanma: "5.2M", embed: "temple-run" },
    { ad: "Zuma", kategori: "Bulmaca", ikon: "fa-frog", puan: 4.7, oynanma: "2.7M", embed: "zuma" },
    { ad: "Soccer", kategori: "Spor", ikon: "fa-futbol", puan: 4.6, oynanma: "1.5M", embed: "soccer" },
    { ad: "2048", kategori: "Zeka", ikon: "fa-brain", puan: 4.9, oynanma: "4.1M", embed: "2048" }
];

// Onboarding
function nextOnboardingStep(step) {
    const current = document.querySelector('.onboarding-step.active');
    const selected = current.querySelectorAll('.select-btn.active');
    if (current.dataset.step === '1' && !selected.length) return alert('Seçim yap!');
    if (current.dataset.step === '2' && !selected.length) return alert('Seçim yap!');
    if (current.dataset.step === '3' && !selected.length) return alert('Seçim yap!');
    if (current.dataset.step === '1') onboardingData.age = selected[0].dataset.age;
    if (current.dataset.step === '2') onboardingData.genres = [...selected].map(s => s.dataset.genre);
    if (current.dataset.step === '3') onboardingData.frequency = selected[0].dataset.frequency;
    document.querySelectorAll('.onboarding-step').forEach(s => s.classList.remove('active'));
    document.querySelector(`[data-step="${step}"]`).classList.add('active');
    tg.HapticFeedback?.impactOccurred('light');
}

function completeOnboarding() {
    const selected = document.querySelector('[data-step="3"]').querySelectorAll('.select-btn.active');
    if (!selected.length) return alert('Seçim yap!');
    onboardingData.frequency = selected[0].dataset.frequency;
    document.getElementById('onboarding').style.display = 'none';
    document.getElementById('mainApp').classList.add('active');
    initUser();
    tg.HapticFeedback?.notificationOccurred('success');
}

document.querySelectorAll('.select-btn').forEach(b => b.addEventListener('click', function() {
    const p = this.parentElement;
    if (!p.classList.contains('genre-grid')) p.querySelectorAll('.select-btn').forEach(x => x.classList.remove('active'));
    this.classList.toggle('active');
}));

function initUser() {
    if (tg.initDataUnsafe?.user) {
        const u = tg.initDataUnsafe.user;
        userData.isPremium = u.is_premium || false;
        document.getElementById('userName').textContent = u.first_name || 'Varia';
        document.getElementById('userUsername').textContent = u.username ? '@'+u.username : '@varia';
        document.getElementById('userAvatar').textContent = (u.first_name||'V')[0].toUpperCase();
        document.getElementById('profileName').textContent = u.first_name || 'Varia';
        document.getElementById('profileAvatar').textContent = (u.first_name||'V')[0].toUpperCase();
        document.getElementById('profileId').textContent = '#'+(u.id||'12345').slice(0,8);
        document.getElementById('referralLink').textContent = `t.me/VariaGameBot?start=${u.id||'varia'}`;
        if (onboardingData.genres?.length) {
            const map = { aksiyon:'stickman', yaris:'moto-x3m', bulmaca:'cut-rope', spor:'soccer' };
            recommendedGame = oyunlar.find(o => o.embed === map[onboardingData.genres[0]]) || oyunlar[0];
        }
        document.getElementById('recommendedGameText').textContent = `${recommendedGame.ad} - Senin için!`;
    }
    calculateLevel(); updateUI(); renderTabs(); renderStreak(); renderFeatured(); renderCharts();
    if (userData.settings.autoPlay && onboardingData.frequency === 'daily') setTimeout(() => { if(confirm(`🎮 ${recommendedGame.name} oyna?`)) playRecommendedGame(); }, 1500);
}

function calculateLevel() {
    userData.level = Math.floor(0.1 * Math.sqrt(userData.xp||0)) + 1;
    userData.xpToNextLevel = Math.pow((userData.level)/0.1, 2);
    userData.earningRate = 0.0025 * (1 + userData.level*0.05) * (userData.isPremium?1.5:1);
    const p = Math.min(((userData.xp||0)/userData.xpToNextLevel)*100, 100);
    document.getElementById('xpFill').style.width = p+'%';
    document.getElementById('currentXp').textContent = Math.floor(userData.xp||0);
    document.getElementById('xpToNextLevel').textContent = Math.floor(userData.xpToNextLevel);
    document.getElementById('userLevel').textContent = userData.level;
    document.getElementById('profileLevel').textContent = userData.level;
    document.getElementById('profileXp').textContent = Math.floor(userData.xp||0);
    document.getElementById('earningRate').textContent = `💰 $${userData.earningRate.toFixed(4)}/dk`;
}

function addXP(amt) {
    const old = userData.level;
    userData.xp = (userData.xp||0) + amt;
    calculateLevel();
    if (userData.level > old) showBanner(`🎉 Seviye ${userData.level}!`, '🌟');
    updateUI();
}

function startEarning() {
    if (earningInterval) clearInterval(earningInterval);
    earningInterval = setInterval(() => {
        if (gameStartTime && (Date.now()-gameStartTime)/60000 >= 0.5) {
            const earned = 0.5 * userData.earningRate;
            userData.balance += earned;
            userData.totalEarned += earned;
            userData.totalMinutes = (userData.totalMinutes||0) + 0.5;
            addXP(3); updateUI();
            showBanner(`+$${earned.toFixed(4)}`, '💰');
            gameStartTime = Date.now();
        }
    }, 30000);
}

function showBanner(msg, emoji) {
    const b = document.getElementById('earningBanner');
    document.getElementById('earningMessage').textContent = msg;
    document.getElementById('earningAmount').innerHTML = `${emoji} $${userData.earningRate.toFixed(4)}/dk`;
    b.classList.add('active');
    setTimeout(() => b.classList.remove('active'), 2500);
}

function playRecommendedGame() { openGame(recommendedGame.embed, recommendedGame.name); }
function openGame(id, title) {
    document.getElementById('modalGameTitle').textContent = title;
    document.getElementById('gameIframe').src = `https://playgama.com/embed/${id}`;
    document.getElementById('gameModal').style.display = 'block';
    gameStartTime = Date.now(); startEarning();
    userData.gamesPlayed++; addXP(5); updateUI();
    tg.HapticFeedback?.impactOccurred('medium');
}
function closeGameModal() {
    document.getElementById('gameModal').style.display = 'none';
    document.getElementById('gameIframe').src = '';
    if (gameStartTime) { addXP(Math.floor((Date.now()-gameStartTime)/60000*5)); gameStartTime = null; }
}

function renderStreak() {
    const d = ['P','S','Ç','P','C','C','P'];
    document.getElementById('streakTracker').innerHTML = d.map((x,i) => {
        let c = i < userData.streak ? 'completed' : (i===userData.streak?'current':'');
        return `<div class="streak-day ${c}"><div class="day-circle">${x}</div><span style="font-size:0.6rem;">${['Pzt','Sal','Çar','Per','Cum','Cmt','Paz'][i]}</span></div>`;
    }).join('');
    document.getElementById('dailyAmount').textContent = (0.5 + userData.streak*0.25).toFixed(2);
}
function claimDaily() {
    if (userData.dailyClaimed) return alert('Bugün topladın!');
    const amt = 0.5 + userData.streak*0.25;
    userData.balance += amt; userData.streak = (userData.streak%7)+1;
    userData.dailyClaimed = true; userData.totalEarned += amt;
    addXP(10*userData.streak); updateUI(); renderStreak();
    tg.HapticFeedback?.notificationOccurred('success');
    showBanner(`+$${amt.toFixed(2)} günlük!`, '🎁');
}

function updateUI() {
    document.getElementById('balanceDisplay').textContent = userData.balance.toFixed(2);
    document.getElementById('totalEarned').textContent = '$'+userData.totalEarned.toFixed(2);
    document.getElementById('totalGames').textContent = userData.gamesPlayed;
    document.getElementById('totalMinutes').textContent = Math.floor(userData.totalMinutes||0);
    document.getElementById('referralCountDisplay').textContent = userData.referrals;
    document.getElementById('referralCount').textContent = `${userData.referrals}/10`;
    document.getElementById('referralProgress').style.width = `${(userData.referrals/10)*100}%`;
}

function switchPage(id) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(id+'Page').classList.add('active');
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.querySelector(`[data-page="${id}"]`).classList.add('active');
    document.getElementById('pageTitle').textContent = id==='home'?'VARİA':id==='games'?'Oyunlar':id==='referral'?'Referans':'Profil';
    if (id==='games') renderAll();
    if (id==='profile') { updateUI(); renderMonthly(); }
    tg.HapticFeedback?.selectionChanged();
}

function renderTabs() {
    const cats = ['Tümü','Aksiyon','Yarış','Bulmaca','Spor','Koşu'];
    document.getElementById('tabsContainer').innerHTML = cats.map(c => `<button class="tab-item ${c===currentTab?'active':''}" onclick="switchTab('${c}')">${c}</button>`).join('');
}
function switchTab(t) { currentTab = t; renderTabs(); filterGames(); }
function filterGames() {
    const term = document.getElementById('searchInput')?.value.toLowerCase()||'';
    const filtered = oyunlar.filter(o => (currentTab==='Tümü'||o.kategori===currentTab) && o.ad.toLowerCase().includes(term));
    renderList(filtered, 'allGamesList');
}
function renderList(games, id) {
    document.getElementById(id).innerHTML = games.map(g => `
        <div class="game-item" onclick="openGame('${g.embed}','${g.ad}')">
            <div class="game-icon"><i class="fas ${g.ikon}"></i></div>
            <div class="game-content"><div class="game-name">${g.ad}</div><div class="game-meta" style="font-size:0.7rem;">${g.kategori} ⭐ ${g.puan}</div></div>
            <div style="font-size:0.7rem;">${g.oynanma}</div>
        </div>
    `).join('');
}
function renderFeatured() { renderList(oyunlar.slice(0,4), 'featuredGames'); }
function renderAll() { renderList(oyunlar, 'allGamesList'); }

function renderCharts() {
    const ctx = document.getElementById('weeklyChart').getContext('2d');
    if (weeklyChart) weeklyChart.destroy();
    weeklyChart = new Chart(ctx, { type:'line', data:{ labels:['Pzt','Sal','Çar','Per','Cum','Cmt','Paz'], datasets:[{ data:[45,82,120,95,150,200,200], borderColor:'#5856D6', backgroundColor:'rgba(88,86,214,0.04)', tension:0.4, fill:true }] }, options:{ responsive:true, maintainAspectRatio:false, plugins:{ legend:{display:false} } } });
}
function renderMonthly() {
    const ctx = document.getElementById('monthlyChart').getContext('2d');
    if (monthlyChart) monthlyChart.destroy();
    monthlyChart = new Chart(ctx, { type:'bar', data:{ labels:['1.Hft','2.Hft','3.Hft','4.Hft'], datasets:[{ data:[120,250,180,342], backgroundColor:'#5856D6', borderRadius:6 }] }, options:{ responsive:true, maintainAspectRatio:false, plugins:{ legend:{display:false} } } });
}

function openModal(id) { document.getElementById(id).classList.add('active'); }
function closeModal(id) { document.getElementById(id).classList.remove('active'); }
function toggleSetting(s) {
    userData.settings[s] = !userData.settings[s];
    document.getElementById('toggle'+s.charAt(0).toUpperCase()+s.slice(1)).classList.toggle('active', userData.settings[s]);
}
function copyReferralLink() { navigator.clipboard?.writeText('https://'+document.getElementById('referralLink').textContent); alert('✅ Kopyalandı!'); }
function openBalanceDetails() { alert(`💰 ${userData.balance.toFixed(2)}\n📊 Toplam: ${userData.totalEarned.toFixed(2)}\n⭐ Lv.${userData.level}`); }
function openStreakInfo() { alert(`🔥 ${userData.streak} gün!\nBugün: $${(0.5+userData.streak*0.25).toFixed(2)}`); }
function openStatsModal() { alert('📊 İstatistikler'); }
function openFilterModal() { alert('🔍 Filtreleme'); }
function openHelpModal() { alert('📞 @VariaGameBot'); }
function shareApp() { tg.openTelegramLink('https://t.me/share/url?url=https://t.me/VariaGameBot&text=VARİA GAME!'); }

document.getElementById('friendList').innerHTML = [{name:'Ali',earned:2.5},{name:'Ayşe',earned:5}].map(f => `<div class="game-item"><div class="user-avatar" style="width:36px;height:36px;">${f.name[0]}</div><div class="game-content"><div>${f.name}</div></div><div style="color:#34C759;">+$${f.earned}</div></div>`).join('');
document.getElementById('notificationsList').innerHTML = [{title:'🎁 Günlük Ödül!',msg:'Ödülün hazır!'},{title:'🎮 Hoş Geldin!',msg:'Oyna, kazan!'}].map(n => `<div class="menu-item"><i class="fas fa-bell"></i><div><div>${n.title}</div><small>${n.msg}</small></div></div>`).join('');

window.nextOnboardingStep = nextOnboardingStep;
window.completeOnboarding = completeOnboarding;
window.switchPage = switchPage;
window.switchTab = switchTab;
window.filterGames = filterGames;
window.openGame = openGame;
window.closeGameModal = closeGameModal;
window.playRecommendedGame = playRecommendedGame;
window.claimDaily = claimDaily;
window.copyReferralLink = copyReferralLink;
window.openModal = openModal;
window.closeModal = closeModal;
window.toggleSetting = toggleSetting;
window.openBalanceDetails = openBalanceDetails;
window.openStreakInfo = openStreakInfo;
window.openStatsModal = openStatsModal;
window.openFilterModal = openFilterModal;
window.openHelpModal = openHelpModal;
window.shareApp = shareApp;
