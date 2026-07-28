/** @typedef {'ILC1' | 'ILC2' | 'ILC3' | 'legacy'} SonyFamily */

/**
 * 机型 → 快门次数字节偏移族（对应 ExifTool Tag9050a/b/c/d）。
 * ILC1: 0x32 · ILC2/ILC3 mid: 0x3a · ILC3 new: 0x0a
 * @type {Record<string, { label: string, family: SonyFamily, offset: number, rated?: number }>}
 */
export const SONY_MODELS = {
  'ILCE-7': { label: 'α7', family: 'ILC1', offset: 0x32, rated: 200000 },
  'ILCE-7M2': { label: 'α7 II', family: 'ILC1', offset: 0x32, rated: 200000 },
  'ILCE-7R': { label: 'α7R', family: 'ILC1', offset: 0x32, rated: 200000 },
  'ILCE-7S': { label: 'α7S', family: 'ILC1', offset: 0x32, rated: 200000 },
  'ILCE-3000': { label: 'α3000', family: 'ILC1', offset: 0x32 },
  'ILCE-3500': { label: 'α3500', family: 'ILC1', offset: 0x32 },
  'ILCE-5000': { label: 'α5000', family: 'ILC1', offset: 0x32 },
  'ILCE-5100': { label: 'α5100', family: 'ILC1', offset: 0x32 },
  'ILCE-6000': { label: 'α6000', family: 'ILC1', offset: 0x32, rated: 200000 },
  'ILCE-QX1': { label: 'QX1', family: 'ILC1', offset: 0x32 },
  'NEX-3N': { label: 'NEX-3N', family: 'ILC1', offset: 0x32 },
  'NEX-5N': { label: 'NEX-5N', family: 'ILC1', offset: 0x32 },
  'NEX-5R': { label: 'NEX-5R', family: 'ILC1', offset: 0x32 },
  'NEX-5T': { label: 'NEX-5T', family: 'ILC1', offset: 0x32 },
  'NEX-6': { label: 'NEX-6', family: 'ILC1', offset: 0x32 },
  'NEX-7': { label: 'NEX-7', family: 'ILC1', offset: 0x32 },
  'NEX-F3': { label: 'NEX-F3', family: 'ILC1', offset: 0x32 },
  'SLT-A37': { label: 'α37', family: 'ILC1', offset: 0x32 },
  'SLT-A57': { label: 'α57', family: 'ILC1', offset: 0x32 },
  'SLT-A58': { label: 'α58', family: 'ILC1', offset: 0x32 },
  'SLT-A65': { label: 'α65', family: 'ILC1', offset: 0x32 },
  'SLT-A65V': { label: 'α65V', family: 'ILC1', offset: 0x32 },
  'SLT-A77': { label: 'α77', family: 'ILC1', offset: 0x32 },
  'SLT-A77V': { label: 'α77V', family: 'ILC1', offset: 0x32 },
  'SLT-A99': { label: 'α99', family: 'ILC1', offset: 0x32 },
  'SLT-A99V': { label: 'α99V', family: 'ILC1', offset: 0x32 },
  'ILCA-68': { label: 'α68', family: 'ILC1', offset: 0x32 },
  'ILCA-77M2': { label: 'α77 II', family: 'ILC1', offset: 0x32 },

  'ILCE-6100': { label: 'α6100', family: 'ILC2', offset: 0x3a, rated: 100000 },
  'ILCE-6300': { label: 'α6300', family: 'ILC2', offset: 0x3a, rated: 200000 },
  'ILCE-6400': { label: 'α6400', family: 'ILC2', offset: 0x3a, rated: 200000 },
  'ILCE-6500': { label: 'α6500', family: 'ILC2', offset: 0x3a, rated: 200000 },
  'ILCE-6600': { label: 'α6600', family: 'ILC2', offset: 0x3a, rated: 200000 },
  'ILCE-7C': { label: 'α7C', family: 'ILC2', offset: 0x3a, rated: 200000 },
  'ILCE-7M3': { label: 'α7 III', family: 'ILC2', offset: 0x3a, rated: 200000 },
  'ILCE-7M4': { label: 'α7 IV', family: 'ILC2', offset: 0x3a, rated: 200000 },
  'ILCE-7RM2': { label: 'α7R II', family: 'ILC2', offset: 0x3a, rated: 500000 },
  'ILCE-7RM3': { label: 'α7R III', family: 'ILC2', offset: 0x3a, rated: 500000 },
  'ILCE-7RM3A': { label: 'α7R IIIA', family: 'ILC2', offset: 0x3a, rated: 500000 },
  'ILCE-7RM4': { label: 'α7R IV', family: 'ILC2', offset: 0x3a, rated: 500000 },
  'ILCE-7RM4A': { label: 'α7R IVA', family: 'ILC2', offset: 0x3a, rated: 500000 },
  'ILCE-7RM5': { label: 'α7R V', family: 'ILC2', offset: 0x3a, rated: 500000 },
  'ILCE-7SM2': { label: 'α7S II', family: 'ILC2', offset: 0x3a, rated: 200000 },
  'ILCE-7SM3': { label: 'α7S III', family: 'ILC2', offset: 0x3a, rated: 600000 },
  'ILCE-9': { label: 'α9', family: 'ILC2', offset: 0x3a, rated: 500000 },
  'ILCE-9M2': { label: 'α9 II', family: 'ILC2', offset: 0x3a, rated: 500000 },
  'ILCE-9M3': { label: 'α9 III', family: 'ILC2', offset: 0x3a, rated: 500000 },
  'ILCE-1': { label: 'α1', family: 'ILC2', offset: 0x3a, rated: 500000 },
  'ILCA-99M2': { label: 'α99 II', family: 'ILC2', offset: 0x3a, rated: 300000 },
  'ILME-FX3': { label: 'FX3', family: 'ILC2', offset: 0x3a },
  'ILME-FX30': { label: 'FX30', family: 'ILC2', offset: 0x3a },
  'ZV-E10': { label: 'ZV-E10', family: 'ILC2', offset: 0x3a },

  'ILCE-6700': { label: 'α6700', family: 'ILC3', offset: 0x0a, rated: 200000 },
  'ILCE-7CM2': { label: 'α7C II', family: 'ILC3', offset: 0x0a, rated: 200000 },
  'ILCE-7CR': { label: 'α7CR', family: 'ILC3', offset: 0x0a, rated: 500000 },
  'ILCE-7M5': { label: 'α7 V', family: 'ILC3', offset: 0x0a, rated: 500000 },
  'ILCE-1M2': { label: 'α1 II', family: 'ILC3', offset: 0x0a, rated: 500000 },
  'ILCE-7RM6': { label: 'α7R VI', family: 'ILC3', offset: 0x0a, rated: 500000 },
  'ZV-E1': { label: 'ZV-E1', family: 'ILC3', offset: 0x0a },
  'ZV-E10M2': { label: 'ZV-E10 II', family: 'ILC3', offset: 0x0a },
  'ILME-FX2': { label: 'FX2', family: 'ILC3', offset: 0x0a },
};

/**
 * @param {string} model
 */
export function lookupSonyModel(model) {
  const key = String(model || '').trim();
  if (SONY_MODELS[key]) return { key, ...SONY_MODELS[key] };

  // 宽松匹配：去掉尾部空格 / 机身变体后缀
  const found = Object.keys(SONY_MODELS).find(
    (k) => key === k || key.startsWith(`${k} `) || key.startsWith(`${k}/`),
  );
  if (found) return { key: found, ...SONY_MODELS[found] };
  return null;
}

/** 未知机型时按常见偏移探测 */
export const FALLBACK_OFFSETS = [0x3a, 0x32, 0x0a];
