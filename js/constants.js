// ==========================================
// 🍔 게임 정적 설정 데이터 (Constants)
// ==========================================

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
    'wrapping_paper': 'images/wrapping_paper.png',
    
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