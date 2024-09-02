// このファイルには、プロジェクト全体で使用される汎用的なユーティリティ関数を定義します。
// 現時点では特定の関数は定義されていませんが、必要に応じて追加できます。

export const formatDate = (date) => {
    return new Date(date).toLocaleString();
};

export const capitalizeFirstLetter = (string) => {
    return string.charAt(0).toUpperCase() + string.slice(1);
};

// その他のユーティリティ関数をここに追加
