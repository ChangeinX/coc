export function timeAgo(date) {
    const ts = new Date(date).getTime();
    const diffSec = Math.floor((Date.now() - ts) / 1000);
    if (diffSec < 60) {
        return `${diffSec} second${diffSec === 1 ? '' : 's'} ago`;
    }
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) {
        return `${diffMin} minute${diffMin === 1 ? '' : 's'} ago`;
    }
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) {
        return `${diffHr} hour${diffHr === 1 ? '' : 's'} ago`;
    }
    const diffDay = Math.floor(diffHr / 24);
    return `${diffDay} day${diffDay === 1 ? '' : 's'} ago`;
}

export function shortTimeAgo(date) {
    const ts = new Date(date).getTime();
    const diffSec = Math.floor((Date.now() - ts) / 1000);
    if (diffSec < 60) {
        return `${diffSec}s`;
    }
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) {
        return `${diffMin}m`;
    }
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) {
        return `${diffHr}h`;
    }
    const diffDay = Math.floor(diffHr / 24);
    return `${diffDay}d`;
}
