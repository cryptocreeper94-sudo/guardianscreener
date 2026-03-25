export interface TradingPreset {
    id: string;
    name: string;
    description: string;
}
export const TradingPreset = {};

export const PRESET_ORDER: string[] = [];
export const TRADING_PRESETS: TradingPreset[] = [];

export function getPresetById(id: string) {
    return null;
}
