#!/bin/bash

# 替换所有 confirm 为 showConfirm

# 1. 删除班级的 confirm（已在代码中替换）

# 2. 撤回评价
sed -i "s/if (!confirm('确定要撤回这条评价吗？')) return/showConfirm({\n    title: '撤回评价',\n    message: '确定要撤回这条评价吗？',\n    confirmText: '撤回',\n    cancelText: '取消',\n    type: 'warning',\n    onConfirm: async () => {/g" src/pages/Home.vue

# 这个替换太复杂，手动处理

echo "请手动替换剩余的 confirm"
