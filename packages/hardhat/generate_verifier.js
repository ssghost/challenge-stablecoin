const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🔍 正在尋找最新的編譯構建文件...");

  // 1. 定義路徑：Hardhat 默認將構建信息存在 artifacts/build-info
  const buildInfoDir = path.join(__dirname, "artifacts", "build-info");
  const outputFile = path.join(__dirname, "verify.json");

  // 檢查目錄是否存在
  if (!fs.existsSync(buildInfoDir)) {
    console.error(`❌ 錯誤: 找不到目錄 ${buildInfoDir}`);
    console.error("請確保您在 packages/hardhat 目錄下運行，且已經執行過 'yarn compile'");
    process.exit(1);
  }

  // 2. 獲取所有 JSON 文件並按時間排序（取最新的那個）
  const files = fs.readdirSync(buildInfoDir).filter((file) => file.endsWith(".json"));
  
  if (files.length === 0) {
    console.error("❌ 錯誤: 在 build-info 中找不到任何 JSON 文件。請先運行 yarn compile。");
    process.exit(1);
  }

  const latestFile = files
    .map((file) => ({
      file,
      mtime: fs.statSync(path.join(buildInfoDir, file)).mtime,
    }))
    .sort((a, b) => b.mtime - a.mtime)[0].file;

  console.log(`📂 讀取最新的構建文件: ${latestFile}`);

  // 3. 讀取並解析 JSON
  const filePath = path.join(buildInfoDir, latestFile);
  const content = fs.readFileSync(filePath, "utf8");
  const jsonContent = JSON.parse(content);

  // 4. 提取 "input" 部分 (這就是 Etherscan 要的 Standard JSON)
  if (!jsonContent.input) {
    console.error("❌ 錯誤: 該構建文件中沒有找到 'input' 屬性！");
    process.exit(1);
  }

  // 驗證一下是否包含我們的目標合約 (可選)
  const sources = Object.keys(jsonContent.input.sources || {});
  const hasEngine = sources.some(s => s.includes("MyUSDEngine.sol"));
  if (hasEngine) {
    console.log("✅ 確認: 文件中包含 MyUSDEngine.sol");
  } else {
    console.warn("⚠️ 警告: 最新的構建文件中似乎不包含 MyUSDEngine.sol，請確認您是否最近編譯過。");
  }

  // 5. 寫入新文件
  fs.writeFileSync(outputFile, JSON.stringify(jsonContent.input, null, 2));

  console.log("\n---------------------------------------------------");
  console.log("🎉 成功！已生成標準驗證文件:");
  console.log(`👉 ${outputFile}`);
  console.log("---------------------------------------------------");
  console.log("下一步操作:");
  console.log("1. 打開 Etherscan 驗證頁面");
  console.log("2. Compiler Type 選擇 'Solidity (Standard-Json-Input)'");
  console.log("3. 上傳這個生成的 'verify.json' 文件");
  console.log("---------------------------------------------------");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});