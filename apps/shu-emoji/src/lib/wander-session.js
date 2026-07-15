/** 单次漫游会话里已经偶遇过的 emoji，避免连抽重复 */
const seen = [];

export function getWanderSeen() {
  return [...seen];
}

export function rememberWander(emoji) {
  if (!emoji) return;
  if (!seen.includes(emoji)) seen.push(emoji);
}

export function clearWanderSeen() {
  seen.length = 0;
}

export function wanderCount() {
  return seen.length;
}
