export async function sendCard(env, dataURI, action, result) {
  const api = env.xhs && env.xhs.miniTool;
  const method = action === 'save' ? 'saveImageToPhotosAlbum' : 'postNote';
  if (!api || typeof api[method] !== 'function') return { ok: false, message: '明信片已生成，请在支持此功能的小红书客户端中' + (action === 'save' ? '保存。' : '发笔记。') };
  try {
    let filePath = dataURI;
    if (typeof api.writeTempFile === 'function') {
      const file = await api.writeTempFile({ data: dataURI });
      if (!file || !file.filePath) throw new Error('临时图片生成失败');
      filePath = file.filePath;
    }
    if (action === 'save') await api.saveImageToPhotosAlbum({ filePath });
    else await api.postNote({ title: result.mode === 'free' ? `慢桨挑战，我漂了${result.distance}米` : '在慢桨，收集一段慢时光', content: result.mode === 'free' ? `三颗心，我漂过了 ${result.distance} 米。个人最佳 ${result.bestDistance || result.distance} 米。下一次，再向前一点。` : `今天在${result.name}，遇见了 ${result.count} 份小美好。不必赶路，沿途也是目的地。`, mediaInfo: { image_resources: [{ url: filePath }] } });
    return { ok: true, message: action === 'save' ? '明信片已保存到相册。' : '已返回游戏，笔记状态以小红书为准。' };
  } catch { return { ok: false, message: '操作未完成，可能已取消或未获授权。明信片还在，可以重试。' }; }
}
