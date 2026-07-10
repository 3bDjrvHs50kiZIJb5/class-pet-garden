#!/bin/bash

# 替换 alert 为 toast

# 警告类
sed -i "s/alert('请输入班级名称')/toast.warning('请输入班级名称')/g" src/pages/Home.vue
sed -i "s/alert('请输入学生姓名')/toast.warning('请输入学生姓名')/g" src/pages/Home.vue
sed -i "s/alert('请输入规则名称')/toast.warning('请输入规则名称')/g" src/pages/Home.vue
sed -i "s/alert('请先选择学生')/toast.warning('请先选择学生')/g" src/pages/Home.vue
sed -i "s/alert('没有识别到学生信息')/toast.warning('没有识别到学生信息')/g" src/pages/Home.vue

# 成功类
sed -i "s/alert(\`成功导入 \${res.data.imported} 名学生\`)/toast.success(\`成功导入 \${res.data.imported} 名学生\`)/g" src/pages/Home.vue
sed -i "s/alert(\`🎉 \${selectedStudent.value.name} 领养了一只 \${pet?.name || '宠物'}！\`)/toast.success(\`🎉 \${selectedStudent.value.name} 领养了一只 \${pet?.name || '宠物'}！\`)/g" src/pages/Home.vue
sed -i "s/alert(\`已删除 \${successCount} 名学生\`)/toast.success(\`已删除 \${successCount} 名学生\`)/g" src/pages/Home.vue
sed -i "s/alert(\`🎓 恭喜！\${student.name} 的宠物毕业了，获得了专属徽章！\`)/toast.success(\`🎓 恭喜！\${student.name} 的宠物毕业了，获得了专属徽章！\`)/g" src/pages/Home.vue
sed -i "s/alert(\`已为 \${successCount} 名学生\${rule.points > 0 ? '加' : '扣'}\${Math.abs(rule.points)}分\`)/toast.success(\`已为 \${successCount} 名学生\${rule.points > 0 ? '加' : '扣'}\${Math.abs(rule.points)}分\`)/g" src/pages/Home.vue
sed -i "s/alert(\`已撤回：\${res.data.undone.student_name} \${res.data.undone.points > 0 ? '+' : ''}\${res.data.undone.points}分\`)/toast.success(\`已撤回：\${res.data.undone.student_name} \${res.data.undone.points > 0 ? '+' : ''}\${res.data.undone.points}分\`)/g" src/pages/Home.vue
sed -i "s/alert('添加成功！')/toast.success('添加成功！')/g" src/pages/Home.vue

# 错误类
sed -i "s/alert('创建班级失败，请重试')/toast.error('创建班级失败，请重试')/g" src/pages/Home.vue
sed -i "s/alert('更新班级失败，请重试')/toast.error('更新班级失败，请重试')/g" src/pages/Home.vue
sed -i "s/alert('添加学生失败，请重试')/toast.error('添加学生失败，请重试')/g" src/pages/Home.vue
sed -i "s/alert('导入失败，请重试')/toast.error('导入失败，请重试')/g" src/pages/Home.vue
sed -i "s/alert('领养失败，请重试')/toast.error('领养失败，请重试')/g" src/pages/Home.vue
sed -i "s/alert('评价失败，请重试')/toast.error('评价失败，请重试')/g" src/pages/Home.vue
sed -i "s/alert('撤回失败')/toast.error('撤回失败')/g" src/pages/Home.vue

echo "替换完成！"
