const fs = require('fs')

let content = fs.readFileSync('server/index.js', 'utf8')

// 替换所有需要用户验证的 API

// 1. 更新班级
content = content.replace(
  /app\.put\('\/api\/classes\/:id', \(req, res\) => \{\n  const \{ name \} = req\.body\n  db\.prepare\('UPDATE classes SET name = \?, updated_at = \? WHERE id = \?'\)\n    \.run\(name, Date\.now\(\), req\.params\.id\)\n  res\.json\(\{ success: true \}\)\n\}\)/g,
  `app.put('/api/classes/:id', authMiddleware, (req, res) => {
  const { name } = req.body
  const classInfo = db.prepare('SELECT user_id FROM classes WHERE id = ?').get(req.params.id)
  if (!classInfo) return res.status(404).json({ error: '班级不存在' })
  if (classInfo.user_id !== req.userId) return res.status(403).json({ error: '无权修改' })
  
  db.prepare('UPDATE classes SET name = ?, updated_at = ? WHERE id = ?')
    .run(name, Date.now(), req.params.id)
  res.json({ success: true })
})`
)

// 2. 删除班级
content = content.replace(
  /app\.delete\('\/api\/classes\/:id', \(req, res\) => \{\n  db\.prepare\('DELETE FROM classes WHERE id = \?'\)\.run\(req\.params\.id\)\n  res\.json\(\{ success: true \}\)\n\}\)/g,
  `app.delete('/api/classes/:id', authMiddleware, (req, res) => {
  const classInfo = db.prepare('SELECT user_id FROM classes WHERE id = ?').get(req.params.id)
  if (!classInfo) return res.status(404).json({ error: '班级不存在' })
  if (classInfo.user_id !== req.userId) return res.status(403).json({ error: '无权删除' })
  
  db.prepare('DELETE FROM classes WHERE id = ?').run(req.params.id)
  res.json({ success: true })
})`
)

fs.writeFileSync('server/index.js', content)
console.log('API 更新完成')
