// ==========================================
// 1. 전역 게임 상태 데이터
// ==========================================
let score = 0;              
let timeLeft = 1200;        
let gameInterval = null;    
let reactionTimeout = null; // 🟢 [추가] 우측 캐릭터 리액션 타이머 꼬임 방지용 스위치

let mouseHolding = {
    type: null,        
    status: null,      
    clickCount: 0      
};

let grillZones = [
    { id: 0, isOccupied: false, type: null, time: 0, isFlipped: false, status: 'none', sideTime: 0 },
    { id: 1, isOccupied: false, type: null, time: 0, isFlipped: false, status: 'none', sideTime: 0 },
    { id: 2, isOccupied: false, type: null, time: 0, isFlipped: false, status: 'none', sideTime: 0 },
    { id: 3, isOccupied: false, type: null, time: 0, isFlipped: false, status: 'none', sideTime: 0 }
];

let burgerBags = [
    { id: 0, stack: [], isPacked: false },
    { id: 1, stack: [], isPacked: false },
    { id: 2, stack: [], isPacked: false },
    { id: 3, stack: [], isPacked: false }
];

const targetRecipe = [
    'bun', 
    'source1_2', 
    'patty_cooked', 
    'cheeze', 
    'onion_cooked', 
    'patty_cooked', 
    'cheeze', 
    'source2_2', 
    'bun'
];

const assetImages = {
    'bun': 'images/bun1.png',
    'bun_top': 'images/bun2.png',
    'cheeze': 'images/cheeze.png',
    'patty_raw': 'images/patty1.png',
    'patty_cooked': 'images/patty2.png',
    'patty_overcooked': 'images/patty3.png',
    'patty_burned': 'images/patty4.png',
    'onion_raw': 'images/onion1.png',
    'onion_cooked': 'images/onion2.png',
    'onion_burned': 'images/onion3.png',
    'source1_1': 'images/red_source1.png',
    'source1_2': 'images/red_source2.png',
    'source1_3': 'images/red_source3.png',
    'source2_1': 'images/white_source1.png',
    'source2_2': 'images/white_source2.png',
    'source2_3': 'images/white_source3.png'
};

// ==========================================
// 2. DOM 요소 캐싱
// ==========================================
const container = document.getElementById('game-container');
const timerEl = document.getElementById('time-val');
const scoreEl = document.getElementById('score-val');
const bellBtn = document.getElementById('serve-bell-btn');
const follower = document.getElementById('mouse-follower');
const grillEls = document.querySelectorAll('.grill-zone');
const bagEls = document.querySelectorAll('.bag-zone');
const trayItems = document.querySelectorAll('.tray-item');

const bgmAudio = document.getElementById('background-bgm');
const sizzleAudio = document.getElementById('sizzle-sound');
const bellAudio = document.getElementById('bell-sound');
const squirtAudio = document.getElementById('squirt-sound');

// 🟢 [추가] 우측 하단 리액션 전용 DOM 요소 매칭
const reactionContainer = document.getElementById('reaction-container');
const reactionImg = document.getElementById('reaction-img');

// ==========================================
// 3. 게임 엔진 초기화
// ==========================================
function init() {
    window.addEventListener('contextmenu', e => e.preventDefault());

    // 🔊 [안전장치 강화] 유저가 화면 어디든 처음 터치/클릭하는 순간 오디오 락을 완전히 해제합니다.
    const unlockAndPlayBGM = () => {
        if (bgmAudio) {
            bgmAudio.volume = 0.5; // 철판 소리가 잘 들리도록 배경음은 은은하게 고정
            bgmAudio.play()
                .then(() => {
                    console.log("🎵 배경음악 재생 성공!");
                    // 한 번 실행에 성공하면 사운드 해제 이벤트를 깔끔하게 소멸시킴
                    window.removeEventListener('click', unlockAndPlayBGM);
                    window.removeEventListener('mousedown', unlockAndPlayBGM);
                })
                .catch(error => {
                    console.error("🚨 오디오 락 해제 실패, 다시 시도합니다. 원인:", error);
                });
        }
    };

    // 클릭, 마우스 다운 이벤트 둘 다 대기 시켜 락을 무조건 해제하게 함
    window.addEventListener('click', unlockAndPlayBGM);
    window.addEventListener('mousedown', unlockAndPlayBGM);

    container.addEventListener('click', (e) => {
        if (!e.target.closest('.tray-item') && !e.target.closest('.grill-zone') && !e.target.closest('.bag-zone') && !e.target.closest('#serve-bell-btn')) {
            clearMouseHolding();
        }
    });

    container.addEventListener('mousemove', (e) => {
        if (mouseHolding.type) {
            const rect = container.getBoundingClientRect();
            follower.style.left = (e.clientX - rect.left) + 'px';
            follower.style.top = (e.clientY - rect.top) + 'px';
        }
    });

    setupEvents();
    startGameLoop();
}

// ==========================================
// 4. 이벤트 핸들러 등록
// ==========================================
function setupEvents() {
    trayItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.stopPropagation();
            const type = item.getAttribute('data-type');
            mouseHolding.type = type;
            mouseHolding.status = (type === 'patty' || type === 'onion') ? 'raw' : 'normal';
            mouseHolding.clickCount = 0;
            updateFollower(e); // 💡 쿵짝을 맞추기 위해 클릭 이벤트(e) 주입
        });
    });

    grillEls.forEach(zoneEl => {
        zoneEl.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = parseInt(zoneEl.getAttribute('data-id'));
            const zone = grillZones[id];

            if (!zone.isOccupied) {
                if (mouseHolding.type === 'patty' || mouseHolding.type === 'onion') {
                    zone.isOccupied = true;
                    zone.type = mouseHolding.type;
                    zone.time = 0;
                    zone.sideTime = 0;
                    zone.isFlipped = false;
                    zone.status = 'raw';
                    zoneEl.style.backgroundImage = `url('${assetImages[zone.type + '_raw']}')`;
                    clearMouseHolding();
                }
            } else {
                if (!mouseHolding.type) {
                    if (zone.type === 'patty' && !zone.isFlipped) {
                        if (zone.sideTime >= 2 && zone.sideTime <= 3) {
                            zone.isFlipped = true;
                            zone.sideTime = 0;
                            zone.status = 'raw'; 
                            zoneEl.style.borderStyle = 'solid'; 
                            zoneEl.style.borderColor = '#8b5a2b';
                        } else {
                            zone.isFlipped = true;
                            zone.sideTime = 0;
                            zone.status = (zone.sideTime > 3) ? 'burned' : 'overcooked';
                            zoneEl.style.borderStyle = 'solid';
                        }
                    } else {
                        mouseHolding.type = zone.type;
                        mouseHolding.status = zone.status;
                        mouseHolding.clickCount = 0;
                        
                        zone.isOccupied = false;
                        zone.type = null;
                        zone.status = 'none';
                        zone.time = 0;
                        zone.sideTime = 0;
                        zone.isFlipped = false;
                        elReset(zoneEl, id);
                        updateFollower(e); // 💡 철판에서 익은 고기 집어올릴 때도 버그 방지 주입
                    }
                }
            }
        });
    });

    bagEls.forEach(bagEl => {
        bagEl.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = parseInt(bagEl.getAttribute('data-id'));
            const bag = burgerBags[id];

            if (bag.isPacked) return;

            if (mouseHolding.type) {
                let layerName = mouseHolding.type;
                
                if (mouseHolding.type === 'patty' || mouseHolding.type === 'onion') {
                    layerName += `_${mouseHolding.status}`;
                }
                if (mouseHolding.type === 'source1' || mouseHolding.type === 'source2') {
                    if (mouseHolding.clickCount < 3) {

                        // 🔊 [🟢 추가] 소스통을 짤 때 공백 없는 'squirt.mp3'를 즉시 연사 재생!
                        if (squirtAudio) {
                            squirtAudio.currentTime = 0; // 광클해도 소리가 안 씹히고 처음부터 다시 터짐
                            squirtAudio.volume = 0.5;    // 효과음 볼륨
                            squirtAudio.play().catch(err => console.log(err));
                        }
                        
                        mouseHolding.clickCount++;
                        updateFollower(e); // 💡 소스 연타할 때도 마우스 위치 갱신 주입
                        
                        const topIndex = bag.stack.findIndex((item, index) => index === bag.stack.length - 1 && item.startsWith(mouseHolding.type));
                        if (topIndex !== -1) {
                            bag.stack[topIndex] = `${mouseHolding.type}_${mouseHolding.clickCount}`;
                            renderBagStack(id);
                            return;
                        } else {
                            layerName += `_${mouseHolding.clickCount}`;
                        }
                    } else {
                        return;
                    }
                }

                bag.stack.push(layerName);
                renderBagStack(id);

                if (mouseHolding.type !== 'source1' && mouseHolding.type !== 'source2') {
                    clearMouseHolding();
                }
            } else {
                if (bag.stack.length > 0) {
                    bag.isPacked = true;
                    bagEl.classList.add('packed');
                    bagEl.querySelector('.bag-name').innerText = `🎁 포장 완료`;
                }
            }
        });
    });

    // 서빙 벨 정산 및 리액션 제어
    bellBtn.addEventListener('click', () => {
        // 🔊 [🟢 추가] 벨 버튼을 클릭한 순간 "땡~" 소리를 즉시 재생!
        if (bellAudio) {
            bellAudio.currentTime = 0; // 벨을 연타해도 소리가 안 씹히고 처음부터 다시 나도록 초기화
            bellAudio.volume = 1;    // 소리 크기 조절
            bellAudio.play().catch(e => console.log("벨 소리 재생 오류:", e));
        }

        let hasPackedBurger = false; // 이번 제출에 포장된 버거가 실존하는지 체크
        let isPerfectSubmit = true;  // 제출한 버거가 전부 만점(10,000원)인지 체크

        burgerBags.forEach((bag, index) => {
            if (bag.isPacked) {
                hasPackedBurger = true;
                const earnedMoney = calculateBurgerPrice(bag.stack);
                
                // 🎯 1원이라도 감점됐다면 완벽 성공 플래그를 꺼버림
                if (earnedMoney < 10000) {
                    isPerfectSubmit = false;
                }

                score += earnedMoney;
                bag.stack = [];
                bag.isPacked = false;
                
                const bagEl = bagEls[index];
                bagEl.classList.remove('packed');
                bagEl.querySelector('.bag-name').innerText = `빵봉지 ${index + 1}`;
                renderBagStack(index);
            }
        });
        
        scoreEl.innerText = score + "원";

        // 🔊 [🟢 추가] 제출한 버거가 있을 때만 우측 하단에 PNG 캐릭터를 1초간 노출
        if (hasPackedBurger) {
            if (reactionTimeout) clearTimeout(reactionTimeout); // 이전 타이머 리셋 안전장치

            if (isPerfectSubmit) {
                reactionImg.src = 'images/clear_perfect.png'; // 1번 완벽 먹방 PNG
            } else {
                reactionImg.src = 'images/clear_fail.png';    // 2번 당황하는 늘님 PNG
            }

            // 숨김 해제 -> 우측 아래에서 스르륵 등장
            reactionContainer.classList.remove('reaction-hidden');

            // ⏱️ 정확히 1초(1000ms) 뒤에 다시 스무스하게 아래로 숨김
            reactionTimeout = setTimeout(() => {
                reactionContainer.classList.add('reaction-hidden');
            }, 1000);
        }
    });
}

// ==========================================
// 5. 정산 채점 시스템
// ==========================================
function calculateBurgerPrice(userStack) {
    let price = 10000; 
    const requiredCategories = ['bun', 'source1', 'source2', 'cheeze', 'patty', 'onion'];
    requiredCategories.forEach(category => {
        const hasIngredient = userStack.some(item => item.startsWith(category));
        if (!hasIngredient) price -= 1000;
    });

    userStack.forEach(item => {
        if (item.includes('_raw') || item.includes('_overcooked') || item.includes('_burned')) price -= 500;
        if (item.includes('_1') || item.includes('_3')) price -= 500;
    });

    let isOrderPerfect = true;
    if (userStack.length !== targetRecipe.length) {
        isOrderPerfect = false;
    } else {
        for (let i = 0; i < targetRecipe.length; i++) {
            if (userStack[i] !== targetRecipe[i]) {
                isOrderPerfect = false;
                break;
            }
        }
    }
    if (!isOrderPerfect) price -= 500;

    return Math.max(0, price);
}

// ==========================================
// 6. 시스템 유틸리티 함수
// ==========================================
function clearMouseHolding() {
    mouseHolding.type = null;
    mouseHolding.status = null;
    mouseHolding.clickCount = 0;
    follower.style.display = 'none';
    follower.style.backgroundImage = 'none';
}

// 🚨 [수정 완료] 클릭 이벤트를 매개변수로 받아 즉시 추적하는 지능형 함수
function updateFollower(e) {
    if (mouseHolding.type) {
        follower.style.display = 'block';
        let imagePath = "";

        if (mouseHolding.type === "source1") {
            imagePath = "images/red_source.png";      // 소스 자국이 아니라 병
        }
        else if (mouseHolding.type === "source2") {
            imagePath = "images/white_source.png";
        }
        else {
            let key = mouseHolding.type;

            if (mouseHolding.type === "patty" || mouseHolding.type === "onion") {
                key += `_${mouseHolding.status}`;
            }

            imagePath = assetImages[key];
        }

        follower.style.backgroundImage = `url('${imagePath}')`;
        // 소스통이면 병을 기울여서 보여줌
        if (mouseHolding.type === "source1" ||
            mouseHolding.type === "source2") {

            follower.style.transform =
                "translate(-20px,-45px) rotate(-135deg)";
        }
        else {
            follower.style.transform =
                "translate(-27px,-27px)";
        }

        // 🎯 핵심 치료 기믹: 마우스가 1픽셀이라도 움직이기 전에 클릭한 그 순간 좌표를 대입합니다.
        if (e) {
            const rect = container.getBoundingClientRect();
            follower.style.left = (e.clientX - rect.left) + 'px';
            follower.style.top = (e.clientY - rect.top) + 'px';
        }
    }
}

function elReset(zoneEl, id) {
    zoneEl.style.backgroundColor = '#777';
    zoneEl.style.backgroundImage = 'none';
    zoneEl.style.borderStyle = 'dashed';
    zoneEl.style.borderColor = '#222';
    zoneEl.innerHTML = `구역 ${id+1}<br><span class="status">비어있음</span>`;
}

// ====================================================================
// 🍔 7. 유저 황금 세팅 하이브리드 조합형 렌더링 함수 (변동 없음)
// ====================================================================
function renderBagStack(bagId) {
    const stackArea = bagEls[bagId].querySelector('.burger-stack');
    stackArea.innerHTML = ''; 
    
    const combinationGaps = {
        'bun_bottom_source1': 2,
        'bun_bottom_source2': 2,
        'bun_bottom_cheeze': 4,
        'bun_bottom_onion': 4,
        'bun_bottom_patty': 14,

        'patty_cheeze': 3,
        'patty_onion': 4,
        'patty_source1': 2,
        'patty_source2': 2,
        'patty_bun_top': 3,

        'source1_patty': 8,
        'cheeze_onion': 3,
        'onion_patty': 12,
        'cheeze_source1': 2,
        'cheeze_source2': 2,
        'cheeze_patty' : 10,

        'source1_bun_top': 3,
        'source2_bun_top': 3,
        'cheeze_bun_top': 3,
        'onion_bun_top': 3,
        'cheeze_bun_top': 3,
    };

    const defaultThickness = {
        'bun_bottom': 5,
        'bun_top': 5,
        'patty': 10,
        'cheeze': 4,
        'onion': 5,
        'source1': 1,
        'source2': 1
    };

    let currentBottom = 5; 

    burgerBags[bagId].stack.forEach((layer, index) => {
        const layerDiv = document.createElement('div');
        layerDiv.className = 'layer';
        
        const rawType = layer.split('_')[0]; 
        let imgKey = layer;
        let currentKey = rawType;

        if (rawType === 'bun') {
            if (index === burgerBags[bagId].stack.length - 1 && index > 0) {
                imgKey = 'bun_top';
                currentKey = 'bun_top';
                layerDiv.classList.add('layer-bun-top');
            } else {
                currentKey = 'bun_bottom';
                layerDiv.classList.add('layer-bun-bottom');
            }
        } else if (rawType === 'source1' || rawType === 'source2') {
            currentKey = rawType;
            layerDiv.classList.add('layer-source');
        } else {
            layerDiv.classList.add(`layer-${rawType}`);
        }

        if (index > 0) {
            const previousLayer = burgerBags[bagId].stack[index - 1];
            const prevType = previousLayer.split('_')[0]; 
            let prevKey = prevType;

            if (prevType === 'bun' && index - 1 === 0) {
                prevKey = 'bun_bottom';
            } else if (prevType === 'source1' || prevType === 'source2') {
                prevKey = prevType;
            }

            const comboName = `${prevKey}_${currentKey}`;
            let gap = 0;

            if (combinationGaps[comboName] !== undefined) {
                gap = combinationGaps[comboName];
            } else {
                const prevThick = defaultThickness[prevKey] !== undefined ? defaultThickness[prevKey] : 4;
                const currThick = defaultThickness[currentKey] !== undefined ? defaultThickness[currentKey] : 4;
                gap = prevThick + currThick; 
            }
            
            currentBottom += gap;
        }

        layerDiv.style.bottom = currentBottom + 'px';
        layerDiv.style.zIndex = index + 1; 
        
        layerDiv.innerText = layer;
        layerDiv.style.backgroundImage = `url('${assetImages[imgKey] || assetImages[rawType]}')`;
        stackArea.appendChild(layerDiv);
    });
}

// ==========================================
// 8. 실시간 조리 타이머 루프 Engine
// ==========================================
function startGameLoop() {
    gameInterval = setInterval(() => {
        timeLeft--;
        timerEl.innerText = timeLeft;

        if (timeLeft <= 0) {
            clearInterval(gameInterval);
            alert(`게임 종료! 총 획득 수익: ${score}원`);
            location.reload();
        }

        // 1. 루프 시작 전 감시 변수를 false로 초기화
        let anyItemCooking = false;

        // 2. 4개의 철판 구역을 '먼저' 싹 훑으며 상태만 계산합니다.
        grillZones.forEach((zone, index) => {
            const el = grillEls[index];
            if (zone.isOccupied) {
                zone.time += 0.1;
                zone.sideTime += 0.1;
                const statusSpan = el.querySelector('.status');

                if (zone.type === 'patty') {
                    if (!zone.isFlipped) {
                        if (zone.sideTime < 2) {
                            zone.status = 'raw';
                            statusSpan.innerText = `첫면 굽는중 ${zone.sideTime.toFixed(1)}초`;
                        } else if (zone.sideTime >= 2 && zone.sideTime <= 3) {
                            zone.status = 'raw';
                            statusSpan.innerText = `🔥 뒤집어! ${zone.sideTime.toFixed(1)}초`;
                        } else {
                            zone.status = 'burned';
                            statusSpan.innerText = `첫면 탐 ${zone.sideTime.toFixed(1)}초`;
                        }
                    } else {
                        if (zone.status === 'burned') {
                            statusSpan.innerText = `이미 탐 ${zone.sideTime.toFixed(1)}초`;
                        } else {
                            if (zone.sideTime < 2) {
                                zone.status = 'raw';
                                statusSpan.innerText = `뒷면 굽는중 ${zone.sideTime.toFixed(1)}초`;
                            } else if (zone.sideTime >= 2 && zone.sideTime <= 3) {
                                zone.status = 'cooked';
                                statusSpan.innerText = `✨ 완벽! 수거해! ${zone.sideTime.toFixed(1)}초`;
                            } else if (zone.sideTime > 3 && zone.sideTime <= 5) {
                                zone.status = 'overcooked';
                                statusSpan.innerText = `오버쿡 ${zone.sideTime.toFixed(1)}초`;
                            } else {
                                zone.status = 'burned';
                                statusSpan.innerText = `탐 ${zone.sideTime.toFixed(1)}초`;
                            }
                        }
                    }
                } else if (zone.type === 'onion') {
                    if (zone.time < 1.5) {
                        zone.status = 'raw';
                    } else if (zone.time >= 1.5 && zone.time <= 3) {
                        zone.status = 'cooked';
                    } else {
                        zone.status = 'burned';
                    }
                    statusSpan.innerText = `양파[${zone.status}] ${zone.time.toFixed(1)}초`;
                }

                // 이미지 업데이트
                let currentKey = `${zone.type}_${zone.status}`;
                if (assetImages[currentKey]) {
                    el.style.backgroundImage = `url('${assetImages[currentKey]}')`;
                }

                // 타지 않은 정상 재료가 올려져 있다면 불빛 켜고 감시 변수 ON
                if (zone.status !== 'burned' && zone.status !== 'none') {
                    el.classList.add('cooking');
                    anyItemCooking = true; 
                } else {
                    el.classList.remove('cooking');
                }
            } else {
                el.classList.remove('cooking');
            }
        }); // 🚨 grillZones.forEach 반복문이 여기서 완벽하게 끝납니다.

        // 🔊 3. [최종 판정] 4개 구역을 다 확인한 '후'에 소리를 딱 한 번 켜거나 끕니다!
        if (anyItemCooking) {
            if (sizzleAudio.paused) {
                sizzleAudio.volume = 0.3; 
                sizzleAudio.play().catch(e => console.log("오디오 재생 제한 우회 중...", e));
            }
        } else {
            if (!sizzleAudio.paused) {
                sizzleAudio.pause();
                sizzleAudio.currentTime = 0; 
            }
        }

    }, 100);
}

window.onload = init;