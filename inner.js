const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const axios = require('axios');

const sourceDir = 'D:/workspace/front'; // 监听的目录
const watchFileName = 'dist'; // 监听的文件夹名称
const zipFile = `dist.zip`;
const weixinApiKey = '这是你的企业微信机器人 key'; // 企业微信机器人 机器人key

// 【企业微信发送信息部分】
async function sendWeixinMessage(message = '') {
  const messageUrl = `https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=${weixinApiKey}`;
  const messageContent = message || `${zipFile}压缩完成`;
  const messageBody = {
    msgtype: 'text',
    text: {
      content: messageContent,
    },
  };
  await axios.post(messageUrl, messageBody);
  console.log(
    `[${new Date().toLocaleString()}]: 已向企业微信发送消息：${messageContent}`
  );
}

// 【压缩部分】
async function compress() {
  const distPath = path.join(sourceDir, watchFileName);
  const distZipPath = path.join(distPath, '..', zipFile);

  // 判断是否有 dist 文件夹
  if (!fs.existsSync(distPath)) {
    console.log(
      `[${new Date().toLocaleString()}]: 未检测到 ${watchFileName} 文件夹，不进行压缩`
    );
    return;
  }

  const isDirEmpty = (() => {
    const dirItems = fs.readdirSync(distPath);
    return dirItems.length === 0;
  })();

  if (isDirEmpty) {
    console.log(
      `[${new Date().toLocaleString()}]: ${watchFileName} 文件夹为空，不进行压缩`
    );
    return;
  }

  // 判断文件是否存在，存在则删除
  if (fs.existsSync(distZipPath)) {
    fs.unlinkSync(distZipPath);
    console.log(`已删除文件：${distZipPath}`);
  }

  const output = fs.createWriteStream(distZipPath);
  const archive = archiver('zip', { zlib: { level: 9 } });

  output.on('close', async function () {
    console.log(
      `[${new Date().toLocaleString()}]: 压缩成功，共 ${archive.pointer()} 个字节`
    );

    // 发送企业微信 信息
    sendWeixinMessage();
  });

  archive.on('error', function (err) {
    console.error(`[${new Date().toLocaleString()}]: 压缩失败: ${err}`);
  });

  archive.pipe(output);

  archive.glob('**/*.*', {
    cwd: distPath,
    dot: false,
    matchBase: false,
  });

  archive.finalize();
}

compress();
