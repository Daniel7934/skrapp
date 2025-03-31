//请在开发中添加InputList，此为订阅文件名，用于指定文件名才能使用本插件，设置标志
//为SUB_FNAMES
//singbox 插件编写

// singbox内置配置文件
const Config = async () => {
  const plugin_config = {
    "id": Plugin.id ?? "plugin-skrapp-ss",
    "name": "skrapp",
    "version": "v1.0.0",
    "description": "skrapp的js版本的shadowsocks",
    "type": "Http",
    "url": "https://raw.githubusercontent.com/Daniel7934/skrapp/refs/heads/main/main.js",
    "path": Plugin.path ?? "data/plugins/plugin-skrapp-ss.js",
    "triggers": [
      "on::manual",
      "on::subscribe"
    ],
    "menus": {},
    "context": {
      "profiles": {},
      "subscriptions": {},
      "rulesets": {},
      "plugins": {},
      "scheduledtasks": {}
    },
    "status": 0,
    "configuration": [
      {
        "id": Plugins.sampleID(),
        "title": "订阅文件名合集",
        "description": "用户将本地添加的订阅文件名输入到插件里",
        "key": "SUB_FNAMES",
        "component": "InputList",
        "value": [],
        "options": []
      },
      {
        "id": Plugins.sampleID(),
        "title": "随机串长度",
        "description": "自定义随机串长度",
        "key": "RAND_LEN",
        "component": "Input",
        "value": "6",
        "options": []
      }
    ],
    "disabled": false,
    "install": false,
    "installed": false
  }
  //注入配置文件
  await Plugins.usePluginsStore().editPlugin(Plugin.id, plugin_config);
  await Plugins.WindowReloadApp();
  return 0
}
//随机字符串生成
function randStr(length) {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'; 
  let randomString = ''; 

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length); // 生成一个随机索引
    randomString += characters.charAt(randomIndex); // 使用随机索引从字符集中获取字符并添加到随机字符串
  }

  return randomString;
}
//Uint8Array存储的十进制数值（计算机内存中显示为2进制）转16进制
function uint8ArrayToHexString(uint8Array) {
  let hexString = '';
  for (let i = 0; i < Object.keys(uint8Array).length; i++) {
    const hexByte = uint8Array[i].toString(16).padStart(2, '0');
    hexString += hexByte;
  }
  return hexString;
}
//解密aes长度为256的密文
async function decrypt(ciphertext, key, iv){
  //密钥类型
  const algorithm = {
      name: 'AES-CBC',
      iv: iv
  }
  //导入密钥
  const cryptoKey = await crypto.subtle.importKey(
      "raw", key, {name: 'AES-CBC',length: 256}, false, ["decrypt"]
  )
  //解密密钥
  const decrypted = await crypto.subtle.decrypt(
      algorithm, cryptoKey, ciphertext
  )
  
  const i = new Uint8Array(decrypted);

  return i
}
function hexStringToUint8Array(hexString) {
  if (hexString.length % 2 !== 0) {
    throw new Error('Invalid hex string length');
  }
  const bytes = new Uint8Array(hexString.length / 2);
  for (let i = 0; i < hexString.length; i += 2) {
    bytes[i / 2] = parseInt(hexString.substr(i, 2), 16);
  }

  return bytes;
}
const checkFileName = async () => {
  if(!Plugin.SUB_FNAMES){
    await Plugins.alert(Plugin.name, '对本插件右键在配置插件中填入订阅文件名（不用填.json），填入后此订阅可以自动更新，若暂时不想添加则先取消<订阅更新时>或禁用本插件')
    return false
  }
  return true
};
const requestsData = async () => {
  const a = 'http://api.skrapp.net/api/serverlist';
  const b = {
      'accept': '/',
      'accept-language': 'zh-Hans-CN;q=1, en-CN;q=0.9',
      'appversion': '1.3.1',
      'User-Agent': 'SkrKK/1.3.1 (iPhone; iOS 13.5; Scale/2.00)',
      'Content-Type': 'application/json',
      'Cookie': 'PHPSESSID=fnffo1ivhvt0ouo6ebqn86a0d4'
    }
  const c = { 'data': '4265a9c353cd8624fd2bc7b5d75d2f18b1b5e66ccd37e2dfa628bcb8f73db2f14ba98bc6a1d8d0d1c7ff1ef0823b11264d0addaba2bd6a30bdefe06f4ba994ed' };
  const { status, body } = await Plugins.HttpPost(a, b, c, {Proxy: null});
  return { status, body }
}
const hexToSbLink = async (status, body) => {
  const dHex = '36353135316638643936366266353936';
  const eHex = '38386361306630656131656366393735';
  
  // 检查 HTTP 状态
  if (status == 200) {
    const hexString = await body.trim();

    //16进制转Uint8Array 类型的字节数组
    const a = hexStringToUint8Array(hexString);
    const key = hexStringToUint8Array(dHex);
    const iv = hexStringToUint8Array(eHex);

    const decryptedUint8Array = await decrypt(a, key, iv)
    const decryptedText = new TextDecoder('utf-8').decode(decryptedUint8Array);
    const jsonObject = JSON.parse(decryptedText);

    let r_sb = []
    jsonObject.data.forEach(item => {
      let ssTosb = {}
      const ssLink = `aes-256-cfb:${item.password}@${item.ip}:${item.port}`;
      const base64Link = Plugins.base64Encode(ssLink)
      const r_ss = `ss://${base64Link}#${item.title}`;
      console.log(r_ss);
      ssTosb.tag = `${item.title}_${randStr(Plugin.RAND_LEN)}`
      ssTosb.type = "shadowsocks"
      ssTosb.server = item.ip
      ssTosb.server_port = Number(item.port)
      ssTosb.method = "aes-256-cfb"
      ssTosb.password = item.password
      r_sb.push(ssTosb)
    });
    return r_sb;
  }
}
function checkSubFileInPath(a, b) {
  if (a.length === 0) {
    return false; 
  }
  return a.some(element => b.includes(element));
}

const onRun = async () => {
  const { status, body } = await requestsData()
  const r_sb = await hexToSbLink(status, body)
  await Plugins.confirm('转换结果如下', r_sb);
  //复制文本
  await Plugins.ClipboardSetText(JSON.stringify(r_sb, null, 2));
  await Plugins.message.success('已复制');
  // requestsData().then(( { status, body } ) => {
  //   return hexToSbLink(status, body)
  // }).then(async (r_sb) => {
  //   await Plugins.confirm('转换结果如下', r_sb);
  //   //复制文本
  //   await Plugins.ClipboardSetText(JSON.stringify(r_sb, null, 2));
  //   await Plugins.message.success('已复制');
  // })
}
//指定文件更新订阅
const onSubscribe = async (proxies, subscription) => {
  if (!(await checkFileName())) return
  if ((await checkSubFileInPath(Plugin.SUB_FNAMES, subscription.path))) {
    console.log("r_sb")
    const { status, body } = await requestsData()
    const r_sb = await hexToSbLink(status, body)
    console.log("恭喜！订阅成功！")
    return r_sb;
  }else return proxies;
};
