export interface SymbolSet {
    full: string;
    empty: string;
    half: string | null;
}

export interface RatingText {
    format: string;
    numerator: number;
    denominator: number;
    text: string;
    endPosition: number;
}
