// ==========================================
// 1. 전역 게임 상태 데이터
// ==========================================
let score = 0;              
let timeLeft = 1200;        
let gameInterval = null;    
let reactionTimeout = null; 

let mouseHolding = {
    type: null,        
    status: null,       // 기존 채점용 데이터 무결성 유지
    displayStatus: null // 🥩 마우스 포인터 및 빵봉지 레이어에 렌더링할 '뒷면 고기 상태' 전용 변수
};

let grillZones = [
    { id: 0, isOccupied: false, type: null, time: 0, isFlipped: false, status: 'none', sideTime: 0, frontStatus: 'none' },
    { id: 1, isOccupied: false, type: null, time: 0, isFlipped: false, status: 'none', sideTime: 0, frontStatus: 'none' },
    { id: 2, isOccupied: false, type: null, time: 0, isFlipped: false, status: 'none', sideTime: 0, frontStatus: 'none' },
    { id: 3, isOccupied: false, type: null, time: 0, isFlipped: false, status: 'none', sideTime: 0, frontStatus: 'none' }
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
    'patty_cooked_cooked', 
    'cheeze', 
    'onion_cooked', 
    'patty_cooked_cooked', 
    'cheeze', 
    'source2_2', 
    'bun'
];

const assetImages = {
    'bun': 'images/bun.png',               
    'bun_bottom': 'images/bun1.png',        
    'bun_top': 'images/bun2.png',           
    'cheeze': 'images/cheeze.png',
    
    'patty_raw': 'images/patty1.png',
    'patty_cooked': 'images/patty2.png',    
    'patty_overcooked': 'images/patty3.png',
    'patty_burned': 'images/patty4.png',    
    
    'patty_raw_raw': 'images/patty1.png',      
    'patty_raw_cooked': 'images/patty1.png',   
    'patty_raw_burned': 'images/patty4.png',   
    'patty_cooked_raw': 'images/patty1.png',   
    'patty_cooked_cooked': 'images/patty2.png',
    'patty_cooked_burned': 'images/patty4.png',

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

const reactionContainer = document.getElementById('reaction-container');
const reactionImg = document.getElementById('reaction-img');

// ==========================================
// 3. 게임 엔진 초기화
// ==========================================
function init() {
    window.addEventListener('contextmenu', e => e.preventDefault());

    const unlockAndPlayBGM = () => {
        if (bgmAudio) {
            bgmAudio.volume = 0.5; 
            bgmAudio.play()
                .then(() => {
                    console.log("🎵 배경음악 재생 성공!");
                    window.removeEventListener('click', unlockAndPlayBGM);
                    window.removeEventListener('mousedown', unlockAndPlayBGM);
                })
                .catch(error => {
                    console.error("🚨 오디오 락 해제 실패:", error);
                });
        }
    };

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
            mouseHolding.displayStatus = (type === 'patty' || type === 'onion') ? 'raw' : 'normal'; 
            updateFollower(e); 
        });
    });

    grillEls.forEach(zoneEl => {
        zoneEl.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = parseInt(zoneEl.getAttribute('data-id'));
            const zone = grillZones[id];

            // 1️⃣ 철판이 비어있을 때
            if (!zone.isOccupied) {
                // 🛑 재조리 불가 핵심 로직 적용: 양파는 기존대로 올리되, 패티는 트레이에서 갓 집어든 생고기('raw') 상태일 때만 올릴 수 있게 차단합니다.
                if (mouseHolding.type === 'onion' || (mouseHolding.type === 'patty' && mouseHolding.status === 'raw')) {
                    zone.isOccupied = true;
                    zone.type = mouseHolding.type;
                    zone.time = 0;
                    zone.sideTime = 0;
                    zone.isFlipped = false;
                    zone.status = 'raw';
                    zone.frontStatus = 'none'; 
                    zoneEl.style.backgroundImage = `url('${assetImages[zone.type + '_raw']}')`;
                    clearMouseHolding();
                }
            } 
            // 2️⃣ 철판에 재료가 구워지고 있을 때
            else {
                const isHandEmpty = !mouseHolding.type;
                const isHoldingSource = (mouseHolding.type === 'source1' || mouseHolding.type === 'source2');

                if (isHandEmpty || isHoldingSource) {
                    
                    // 🥩 [패티 뒤집기] 패티가 아직 첫 면을 굽는 중이고 아직 타지 않았다면 뒤집기 가능
                    if (zone.type === 'patty' && !zone.isFlipped && zone.status !== 'burned') {
                        if (zone.sideTime >= 2 && zone.sideTime <= 3) {
                            zone.frontStatus = 'cooked'; 
                        } else if (zone.sideTime > 3) {
                            zone.frontStatus = 'burned'; 
                        } else {
                            zone.frontStatus = 'raw';    
                        }

                        zone.isFlipped = true;
                        zone.sideTime = 0; 
                        
                        if (zone.frontStatus === 'burned') {
                            zone.status = 'burned';
                        } else {
                            zone.status = 'raw'; 
                        }
                        zoneEl.style.borderStyle = 'solid'; 
                        zoneEl.style.borderColor = '#8b5a2b';
                    } 
                    // 🧺 [스마트 즉시 수거 시스템] 이미 뒤집었거나, 한 면이라도 탔거나, 양파 슬라이스일 때 즉시 수거
                    else {
                        if (isHoldingSource) {
                            clearMouseHolding(); 
                        }

                        mouseHolding.type = zone.type;
                        
                        if (zone.type === 'patty') {
                            let backStatus = 'raw';
                            if (zone.isFlipped) {
                                if (zone.sideTime >= 2 && zone.sideTime <= 3) {
                                    backStatus = 'cooked'; 
                                } else if (zone.sideTime > 3) {
                                    backStatus = 'burned'; 
                                }
                            }

                            if (zone.frontStatus === 'burned' || zone.status === 'burned' || backStatus === 'burned') {
                                mouseHolding.status = 'burned'; 
                                mouseHolding.displayStatus = 'burned'; 
                            } else {
                                mouseHolding.status = `${zone.frontStatus}_${backStatus}`;
                                mouseHolding.displayStatus = backStatus;
                            }
                        } else {
                            mouseHolding.status = zone.status;
                            mouseHolding.displayStatus = zone.status;
                        }
                        
                        // 철판 리셋
                        zone.isOccupied = false;
                        zone.type = null;
                        zone.status = 'none';
                        zone.frontStatus = 'none';
                        zone.time = 0;
                        zone.sideTime = 0;
                        zone.isFlipped = false;
                        elReset(zoneEl, id);
                        updateFollower(e); 
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
                
                if (mouseHolding.type === 'patty') {
                    layerName += `_${mouseHolding.status}_${mouseHolding.displayStatus}`;
                } else if (mouseHolding.type === 'onion') {
                    layerName += `_${mouseHolding.status}`;
                }
                
                if (mouseHolding.type === 'source1' || mouseHolding.type === 'source2') {
                    if (squirtAudio) {
                        squirtAudio.currentTime = 0; 
                        squirtAudio.volume = 0.5;    
                        squirtAudio.play().catch(err => console.log(err));
                    }

                    const topItem = bag.stack.length > 0 ? bag.stack[bag.stack.length - 1] : "";

                    if (topItem.startsWith(mouseHolding.type)) {
                        const currentCount = parseInt(topItem.split('_')[1]);
                        if (currentCount < 3) {
                            bag.stack[bag.stack.length - 1] = `${mouseHolding.type}_${currentCount + 1}`;
                            renderBagStack(id);
                            return; 
                        } else {
                            return; 
                        }
                    } else {
                        layerName += `_1`;
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

    bellBtn.addEventListener('click', () => {
        if (bellAudio) {
            bellAudio.currentTime = 0; 
            bellAudio.volume = 1;    
            bellAudio.play().catch(e => console.log(e));
        }

        let hasPackedBurger = false; 
        let isPerfectSubmit = true;  

        burgerBags.forEach((bag, index) => {
            if (bag.isPacked) {
                hasPackedBurger = true;
                const earnedMoney = calculateBurgerPrice(bag.stack);
                
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

        if (hasPackedBurger) {
            if (reactionTimeout) clearTimeout(reactionTimeout); 

            if (isPerfectSubmit) {
                reactionImg.src = 'images/clear_perfect.png'; 
            } else {
                reactionImg.src = 'images/clear_fail.png';    
            }

            reactionContainer.classList.remove('reaction-hidden');

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
        if (item.startsWith('source1_1') || item.startsWith('source1_3')) price -= 500;
        if (item.startsWith('source2_1') || item.startsWith('source2_3')) price -= 500;
        
        if (item.startsWith('onion_burned')) price -= 500;
        if (item.startsWith('onion_raw')) price -= 500;
    });

    userStack.forEach(item => {
        if (item.startsWith('patty_')) {
            const pattyType = item.replace('patty_', ''); 
            
            const parts = pattyType.split('_');
            let finalPattyKey = pattyType;
            if (parts.length >= 3) {
                finalPattyKey = `${parts[0]}_${parts[1]}`;
            }

            switch(finalPattyKey) {
                case 'raw_raw':     
                    price -= 1000;  
                    break;
                case 'raw_cooked':  
                    price -= 500;   
                    break;
                case 'raw_burned':  
                    price -= 1000;  
                    break;
                case 'cooked_raw':  
                    price -= 500;   
                    break;
                case 'cooked_cooked': 
                    break;
                case 'cooked_burned': 
                    price -= 1000;  
                    break;
                case 'burned':      
                    price -= 2000;  
                    break;
            }
        }
    });

    let isOrderPerfect = true;
    if (userStack.length !== targetRecipe.length) {
        isOrderPerfect = false;
    } else {
        for (let i = 0; i < targetRecipe.length; i++) {
            let userLayer = userStack[i];
            if (userLayer.startsWith('patty_')) {
                const p = userLayer.split('_');
                if (p.length >= 4) userLayer = `${p[0]}_${p[1]}_${p[2]}`;
            }
            if (userLayer !== targetRecipe[i]) {
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
    mouseHolding.displayStatus = null;
    follower.style.display = 'none';
    follower.style.backgroundImage = 'none';
}

function updateFollower(e) {
    if (mouseHolding.type) {
        follower.style.display = 'block';
        let imagePath = "";

        if (mouseHolding.type === "source1") {
            imagePath = "images/red_source.png";      
        }
        else if (mouseHolding.type === "source2") {
            imagePath = "images/white_source.png";
        }
        else {
            let key = mouseHolding.type;

            if (mouseHolding.type === "patty") {
                key += `_${mouseHolding.displayStatus}`;
            } else if (mouseHolding.type === "onion") {
                const shortStatus = mouseHolding.status.split('_')[0];
                key += `_${shortStatus}`;
            }

            imagePath = assetImages[key] || assetImages[mouseHolding.type];
        }

        follower.style.backgroundImage = `url('${imagePath}')`;
        
        if (mouseHolding.type === "source1" || mouseHolding.type === "source2") {
            follower.style.transform = "translate(-20px,-45px) rotate(-135deg)";
        }
        else {
            follower.style.transform = "translate(-27px,-27px)";
        }

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
// 🍔 7. 유저 황금 세팅 하이브리드 조합형 렌더링 함수
// ====================================================================
function renderBagStack(bagId) {
    const stackArea = bagEls[bagId].querySelector('.burger-stack');
    stackArea.innerHTML = ''; 
    
    const combinationGaps = {
        'bun_bottom_source1': 2, 'bun_bottom_source2': 2, 'bun_bottom_cheeze': 4, 'bun_bottom_onion': 4, 'bun_bottom_patty': 14,
        'patty_raw_raw_cheeze': 3, 'patty_raw_cooked_cheeze': 3, 'patty_cooked_raw_cheeze': 3, 'patty_cooked_cooked_cheeze': 3,
        'patty_raw_raw_onion': 4, 'patty_raw_cooked_onion': 4, 'patty_cooked_raw_onion': 4, 'patty_cooked_cooked_onion': 4,
        'patty_raw_raw_source1': 2, 'patty_raw_cooked_source1': 2, 'patty_cooked_raw_source1': 2, 'patty_cooked_cooked_source1': 2,
        'patty_raw_raw_source2': 2, 'patty_raw_cooked_source2': 2, 'patty_cooked_raw_source2': 2, 'patty_cooked_cooked_source2': 2,
        'patty_raw_raw_bun_top': 3, 'patty_raw_cooked_bun_top': 3, 'patty_cooked_raw_bun_top': 3, 'patty_cooked_cooked_bun_top': 3,
        'patty_cheeze': 3, 'patty_onion': 4, 'patty_source1': 2, 'patty_source2': 2, 'patty_bun_top': 3,
        'source1_patty': 8, 'cheeze_onion': 3, 'onion_patty': 12, 'cheeze_source1': 2, 'cheeze_source2': 2, 'cheeze_patty' : 10,
        'source1_bun_top': 3, 'source2_bun_top': 3, 'cheeze_bun_top': 3, 'onion_bun_top': 3,
    };

    const defaultThickness = {
        'bun_bottom': 5, 'bun_top': 5, 'patty': 10, 'cheeze': 4, 'onion': 5, 'source1': 1, 'source2': 1
    };

    let currentBottom = 5; 

    burgerBags[bagId].stack.forEach((layer, index) => {
        const layerDiv = document.createElement('div');
        layerDiv.className = 'layer';
        
        const parts = layer.split('_');
        const rawType = parts[0]; 
        let imgKey = layer;
        let currentKey = rawType;

        if (rawType === 'bun') {
            if (index === burgerBags[bagId].stack.length - 1 && index > 0) {
                imgKey = 'bun_top';        
                currentKey = 'bun_top';
                layerDiv.classList.add('layer-bun-top');
            } else {
                imgKey = 'bun_bottom';     
                currentKey = 'bun_bottom';
                layerDiv.classList.add('layer-bun-bottom');
            }
        } else if (rawType === 'source1' || rawType === 'source2') {
            currentKey = rawType;
            layerDiv.classList.add('layer-source');
        } else if (rawType === 'patty') {
            layerDiv.classList.add(`layer-${rawType}`);
            const backStatus = parts[3] || parts[1];
            imgKey = `patty_${backStatus}`; 
        } else {
            layerDiv.classList.add(`layer-${rawType}`);
        }

        if (index > 0) {
            const previousLayer = burgerBags[bagId].stack[index - 1];
            const prevType = previousLayer.split('_')[0]; 
            let prevKey = previousLayer; 

            if (prevType === 'bun' && index - 1 === 0) {
                prevKey = 'bun_bottom';
            } else if (prevType === 'source1' || prevType === 'source2') {
                prevKey = prevType;
            }

            let comboName = `${prevKey}_${currentKey}`;
            let gap = 0;

            if (combinationGaps[comboName] !== undefined) {
                gap = combinationGaps[comboName];
            } else {
                const fallbackKey = `${prevType}_${currentKey}`;
                if (combinationGaps[fallbackKey] !== undefined) {
                    gap = combinationGaps[fallbackKey];
                } else {
                    const prevThick = defaultThickness[prevKey] !== undefined ? defaultThickness[prevKey] : 4;
                    const currThick = defaultThickness[currentKey] !== undefined ? defaultThickness[currentKey] : 4;
                    gap = prevThick + currThick; 
                }
            }
            
            currentBottom += gap;
        }

        layerDiv.style.bottom = currentBottom + 'px';
        layerDiv.style.zIndex = index + 1; 
        
        layerDiv.innerText = parts[0] + (parts[1] ? `_${parts[1]}` : '');
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

        let anyItemCooking = false;

        grillZones.forEach((zone, index) => {
            const el = grillEls[index];
            if (zone.isOccupied) {
                const statusSpan = el.querySelector('.status');

                if (zone.status === 'burned') {
                    statusSpan.innerText = `${zone.type === 'patty' ? '고기' : '양파'} 완전히 탐! [수거만 가능]`;
                    el.style.backgroundImage = `url('${assetImages[zone.type + '_burned']}')`;
                    el.classList.remove('cooking');
                    return;
                }

                zone.time += 0.1;
                zone.sideTime += 0.1;

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
                            zone.frontStatus = 'burned';
                        }
                    } else {
                        if (zone.sideTime < 2) {
                            zone.status = 'raw';
                            statusSpan.innerText = `뒷면 굽는중 ${zone.sideTime.toFixed(1)}초`;
                        } else if (zone.sideTime >= 2 && zone.sideTime <= 3) {
                            zone.status = 'cooked';
                            statusSpan.innerText = `✨ 뒷면 완벽! ${zone.sideTime.toFixed(1)}초`;
                        } else {
                            zone.status = 'burned'; 
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

                if (zone.status !== 'burned') {
                    let currentKey = `${zone.type}_${zone.status}`;
                    if (assetImages[currentKey]) {
                        el.style.backgroundImage = `url('${assetImages[currentKey]}')`;
                    }
                    el.classList.add('cooking');
                    anyItemCooking = true; 
                } else {
                    el.style.backgroundImage = `url('${assetImages[zone.type + '_burned']}')`;
                    el.classList.remove('cooking');
                }
            } else {
                el.classList.remove('cooking');
            }
        }); 

        if (anyItemCooking) {
            if (sizzleAudio.paused) {
                sizzleAudio.volume = 0.3; 
                sizzleAudio.play().catch(e => console.log(e));
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