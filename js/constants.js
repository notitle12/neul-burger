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
    'grill': 'images/grill.webp',
    'wrapping_paper': 'images/wrapping_paper.webp',
    'wrapping_paper_seal': 'images/wraping_paper_seal.webp',
    
    'bun': 'images/bun.webp',               
    'bun_bottom': 'images/bun1.webp',        
    'bun_top': 'images/bun2.webp',           
    'cheeze': 'images/cheeze.webp',
    
    'patty_raw': 'images/patty1.webp',
    'patty_front_cooked': 'images/patty2.webp',
    'patty_cooked': 'images/patty2.webp',    
    'patty_overcooked': 'images/patty3.webp',
    'patty_burned': 'images/patty4.webp',    
    
    'patty_raw_raw': 'images/patty1.webp',      
    'patty_raw_cooked': 'images/patty1.webp',   
    'patty_raw_burned': 'images/patty4.webp',   
    'patty_cooked_raw': 'images/patty1.webp',   
    'patty_cooked_cooked': 'images/patty2.webp',
    'patty_cooked_burned': 'images/patty4.webp',

    'onion_raw': 'images/onion1.webp',
    'onion_cooked': 'images/onion2.webp',
    'onion_burned': 'images/onion3.webp',
    'source1_1': 'images/red_source1.webp',
    'source1_2': 'images/red_source2.webp',
    'source1_3': 'images/red_source3.webp',
    'source2_1': 'images/white_source1.webp',
    'source2_2': 'images/white_source2.webp',
    'source2_3': 'images/white_source3.webp'
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