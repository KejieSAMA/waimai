<script setup lang="ts">
import { onMounted } from "vue";
import { Button, Input, Select, Tag, Dialog, AccountForm } from "@waimai/ui";
import { useAdminAccounts, time } from "@waimai/shared";
import { api } from "../../../common/api";
const manager = useAdminAccounts((path, options) =>
  api(path, options, "ADMIN"),
);
const s = manager.state;
const roles = { USER: "用户", MERCHANT: "商家", ADMIN: "管理员" };
const roleLabels = (values: string[]) =>
  values.map((r) => roles[r as keyof typeof roles] ?? r).join("、");
const actions: Record<string, string> = {
  "account-create": "创建账号",
  "account-edit": "修改资料",
  "account-roles": "修改身份",
  "account-status": "修改状态",
  "account-password": "重置密码",
  "account-password-change": "修改密码",
  "account-profile": "修改本人资料",
  "account-bootstrap": "初始化管理员",
  "account-recover": "恢复管理员",
};
onMounted(manager.load);
</script>
<template>
  <div class="app-stack">
    <form class="app-card app-stack" @submit.prevent="manager.query()">
      <Input
        v-model="s.keyword"
        placeholder="搜索账号、昵称"
        aria-label="账号关键词"
      />
      <Select
        v-model="s.role"
        label="角色"
        :options="[
          { value: '', label: '全部角色' },
          ...Object.entries(roles).map(([value, label]) => ({ value, label })),
        ]"
      /><Select
        v-model="s.status"
        label="状态"
        :options="[
          { value: '', label: '全部状态' },
          { value: 'ACTIVE', label: '启用' },
          { value: 'DISABLED', label: '停用' },
        ]"
      />
      <div class="app-row">
        <Button type="submit">查询</Button
        ><Button variant="outline" @click="manager.query(true)">重置</Button
        ><Button variant="secondary" @click="manager.open('create')"
          >创建账号</Button
        >
      </div>
    </form>
    <p v-if="s.error" class="app-error body-sm" role="alert">
      {{ s.error }}<Button variant="text" @click="manager.load">重试</Button>
    </p>
    <p v-if="s.loading" class="body-sm" role="status">加载中</p>
    <p v-else-if="!s.list.length && !s.error" class="body-sm">暂无账号</p>
    <section
      v-for="account in s.list"
      :key="account.id"
      class="app-card app-stack"
    >
      <div class="app-row">
        <strong>{{ account.username }}</strong
        ><Tag :tone="account.status === 'ACTIVE' ? 'success' : 'neutral'">{{
          account.status === "ACTIVE" ? "启用" : "停用"
        }}</Tag>
      </div>
      <p class="body-sm">
        {{ account.name }} · {{ roleLabels(account.roles) }} ·
        {{ account.phone || "未填手机" }}
      </p>
      <p class="caption">
        创建 {{ time(account.createdAt) }} · 最近登录
        {{ account.lastLoginAt ? time(account.lastLoginAt) : "尚未登录" }}
      </p>
      <div class="app-row">
        <Button
          size="sm"
          variant="text"
          :disabled="s.saving"
          @click="manager.open('edit', account)"
          >查看</Button
        ><Button
          size="sm"
          variant="text"
          :disabled="s.saving"
          @click="manager.status(account)"
          >{{ account.status === "ACTIVE" ? "停用" : "启用" }}</Button
        ><Button
          size="sm"
          variant="text"
          :disabled="s.saving"
          @click="manager.open('password', account)"
          >重置密码</Button
        >
      </div>
    </section>
    <div class="app-row">
      <Button
        variant="outline"
        :disabled="s.loading || s.page <= 1"
        @click="
          s.page--;
          manager.load();
        "
        >上一页</Button
      ><span class="body-sm">{{ s.page }} / {{ manager.pages.value }}</span
      ><Button
        variant="outline"
        :disabled="s.loading || s.page >= manager.pages.value"
        @click="
          s.page++;
          manager.load();
        "
        >下一页</Button
      >
    </div>
    <Dialog
      :open="s.open"
      :title="
        s.kind === 'create'
          ? '创建账号'
          : s.kind === 'password'
            ? '重置密码'
            : s.kind === 'status'
              ? '变更状态'
              : '账号详情'
      "
      variant="sheet"
      :close-disabled="s.saving"
      @close="manager.close"
    >
      <p v-if="s.detailLoading" class="body-sm" role="status">加载账号中</p>
      <form
        v-else
        id="account-form"
        class="app-stack"
        @submit.prevent="
          s.kind === 'status' ? manager.confirmStatus() : manager.save()
        "
      >
        <p v-if="s.kind === 'status'" class="body-md">
          确认变更
          {{ s.form.username }}
          的启用状态。禁用商家将同时冻结店铺，恢复账号后须另行解冻。
        </p>
        <AccountForm
          v-else
          v-model:form="s.form"
          :kind="s.kind"
          :disabled="s.saving"
        />
        <template v-if="s.kind === 'edit'"
          ><div class="app-row">
            <Button
              variant="outline"
              :disabled="s.saving || s.detailLoading || !s.detailReady"
              @click="manager.save('roles')"
              >保存身份</Button
            ><Button variant="text" :disabled="s.saving" @click="manager.audit"
              >操作记录</Button
            >
          </div>
          <div v-for="item in s.audit" :key="item.id" class="body-sm">
            {{ time(item.createdAt) }} · {{ item.actorName ?? "历史操作者" }} ·
            {{ actions[item.action] ?? "账号操作" }} {{ item.reason ?? "" }}
          </div></template
        >
        <p v-if="s.dialogError" class="app-error body-sm" role="alert">
          {{ s.dialogError
          }}<Button
            v-if="!s.detailReady"
            size="sm"
            variant="text"
            @click="manager.retryDetail"
            >重试</Button
          >
        </p>
      </form>
      <template #actions
        ><Button variant="outline" :disabled="s.saving" @click="manager.close"
          >取消</Button
        ><Button
          type="submit"
          form="account-form"
          :disabled="s.saving || s.detailLoading || !s.detailReady"
          >{{
            s.saving ? "保存中" : s.kind === "password" ? "重置密码" : "保存"
          }}</Button
        ></template
      ></Dialog
    >
  </div>
</template>
