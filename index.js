const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const axios = require('axios');
const FormData = require('form-data');

const sourceDir = 'D:/workspace/front'; // 监听的目录
const watchFileName = 'dist'; // 监听的文件夹名称
const zipFile = `dist.zip`;
const weixinApiKey = '这是你的企业微信机器人 key'; // 企业微信机器人 机器人key
const weixinUploadUrl = `https://qyapi.weixin.qq.com/cgi-bin/webhook/upload_media?key=${weixinApiKey}&type=file`;

// 【企业微信发送信息部分】
async function sendWeixinMessage(mediaId = null, message = '') {
  const messageUrl = `https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=${weixinApiKey}`;
  const messageContent = message || `${zipFile}压缩完成`;
  if (mediaId) {
    const requestBody = {
      msgtype: 'file',
      file: {
        media_id: mediaId,
      },
    };
    await axios.post(messageUrl, requestBody);
  }
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

    let media_id = '';

    // 将打包完成的文件上传企业微信
    // media_id = await uploadZip(distZipPath);

    // 发送企业微信 信息
    sendWeixinMessage(media_id);
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

// 【企业微信上传文件部分】
async function uploadZip(distZipPath) {
  // 发送文件到企业微信
  const bufferData = fs.readFileSync(distZipPath);

  const formData = new FormData();
  formData.append('media', bufferData, { filename: zipFile });
  const config = {
    headers: {
      'Content-Type': `multipart/form-data; boundary=${formData._boundary}`,
    },
  };

  try {
    const {
      data: { media_id },
    } = await axios.post(weixinUploadUrl, formData, config);
    console.log(
      `[${new Date().toLocaleString()}]: 文件上传成功，media_id为 ${
        media_id
      }`
    );
    return media_id;
    
  } catch (err) {
    console.error(`[${new Date().toLocaleString()}]: 文件上传失败: ${err}`);
  }
};

let timer = null; 
//【监听部分】 监听 dist 文件夹 部分
fs.watch(sourceDir, { recursive: true }, (event, filename) => {
  if (filename !== watchFileName) {
    return;
  }
  clearTimeout(timer)
  // 这一段用来测试打印 计算得出下面的 10s,我这边应该是8S左右，目前没有一个好一点 简单一点 的办法监听dist文件夹里面的东西完全生成成功
  console.log(
    `[${new Date().toLocaleString()}]: 检测到 ${watchFileName} 文件夹变化，开始打印`
  );

  timer = setTimeout(() => {
    console.log(
      `[${new Date().toLocaleString()}]: 检测到 ${watchFileName} 文件夹变化，开始压缩...`
    );
    compress();
  }, 10000); // 延迟 10s 后压缩，如果没有变化就正常进行压缩
});
