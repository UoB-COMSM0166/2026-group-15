# SuperCatAndSteve

## Try the Game

https://uob-comsm0166.github.io/2026-group-15/SuperCatAndSteve/

## Start Modify with Git

### 1. 首次克隆仓库

```powershell
cd C:\Users\redmi
git clone https://github.com/UoB-COMSM0166/2026-group-15.git
cd 2026-group-15
```

### 2. 开始新工作前，获取最新代码

```powershell
git checkout main
git pull origin main
```

### 3. 创建新分支进行开发

```powershell
# 创建并切换到新分支
git checkout -b feature/my-new-feature

# 进行修改...
```

### 4. 复制本地修改的文件

```powershell
# 复制单个文件
Copy-Item "D:\SE displine and practice\SuperCatAndSteve\sketch.js" ".\SuperCatAndSteve\sketch.js"

# 或复制整个文件夹
Copy-Item -Recurse "D:\SE displine and practice\SuperCatAndSteve\*" ".\SuperCatAndSteve\" -Force
```

### 5. 提交修改

```powershell
git add .
git commit -m "描述你的修改内容"
```

### 6. 推送分支到 GitHub

```powershell
git push -u origin feature/my-new-feature
```

### 7. 在 GitHub 网页上创建 Pull Request

1. 打开 GitHub 仓库页面
2. 点击 "Compare & pull request"
3. 填写说明，点击 "Create pull request"

### 8. 审核通过后，合并到 main

- 在 GitHub 网页点击 "Merge pull request"

### 9. 合并后，更新本地代码

```powershell
git checkout main
git pull origin main

# 删除已合并的本地分支（可选）
git branch -d feature/my-new-feature
```

### 常见问题处理

#### 推送被拒绝（远程有更新）

```powershell
git pull origin main
git push
```

#### 查看当前状态

```powershell
git status
```

#### 查看所有分支

```powershell
git branch -a
```

#### 切换分支

```powershell
git checkout 分支名
```

## Running Locally

For projects with media files, use a local server:

```bash
# Using Python
python -m http.server 8000

# Using Node.js
npx http-server

# Using VS Code Live Server extension
# Right-click index.html -> "Open with Live Server"
```

## Resources

- [p5.js 2.0](https://beta.p5js.org/)
- [p5.js Reference](https://p5js.org/reference/)
