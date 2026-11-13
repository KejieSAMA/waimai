<script setup lang="ts">
import { DEFAULT_PAGE_SIZE } from "@waimai/shared";
import BackofficePage from "../../../components/BackofficePage.vue";
import DataTable from "../../../components/DataTable.vue";
import FilterBar from "../../../components/FilterBar.vue";
import Pagination from "../../../components/Pagination.vue";
import { onMounted } from "vue";
import {
  Button,
  Input,
  Select,
  Tag,
  Dialog,
  AccountForm,
} from "../../../components/pc";
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
  <BackofficePage :body-scroll="false">
    <template #header
      ><FilterBar @search="manager.query()" @reset="manager.query(true)">
        <Input
          v-model="s.keyword"
          placeholder="搜索账号、昵称"
          aria-label="账号关键词"
          @keydown.enter.prevent="manager.query()"
        />
        <Select
          v-model="s.role"
          label="角色"
          :options="[
            { value: '', label: '全部角色' },
            ...Object.entries(roles).map(([value, label]) => ({
              value,
              label,
            })),
          ]"
        />
        <Select
          v-model="s.status"
          label="状态"
          :options="[
            { value: '', label: '全部状态' },
            { value: 'ACTIVE', label: '启用' },
            { value: 'DISABLED', label: '停用' },
          ]"
        />
        <template #actions
          ><Button :disabled="s.saving" @click="manager.open('create')"
            >创建账号</Button
          ></template
        ></FilterBar
      >
      <p v-if="s.error" class="app-error body-sm" role="alert">
        {{ s.error }}<Button variant="text" @click="manager.load">重试</Button>
      </p></template
    >
    <DataTable
      fill
      :rows="s.list"
      :aria-busy="s.loading"
      :reset-key="String(s.page)"
      :columns="[
        { key: 'username', title: '账号' },
        { key: 'name', title: '昵称' },
        { key: 'roles', title: '授权身份' },
        { key: 'phone', title: '联系手机' },
        { key: 'status', title: '状态' },
        { key: 'createdAt', title: '创建时间' },
        { key: 'lastLoginAt', title: '最近登录' },
        { key: 'actions', title: '操作' },
      ]"
    >
      <template #roles="{ row }">{{ roleLabels(row.roles) }}</template>
      <template #status="{ row }"
        ><Tag :tone="row.status === 'ACTIVE' ? 'success' : 'neutral'">{{
          row.status === "ACTIVE" ? "启用" : "停用"
        }}</Tag></template
      >
      <template #createdAt="{ row }">{{ time(row.createdAt) }}</template
      ><template #lastLoginAt="{ row }">{{
        row.lastLoginAt ? time(row.lastLoginAt) : "尚未登录"
      }}</template>
      <template #actions="{ row }"
        ><div class="app-table-actions">
          <Button
            size="sm"
            variant="text"
            :disabled="s.saving"
            @click="manager.open('edit', row)"
            >查看</Button
          ><Button
            size="sm"
            variant="text"
            :disabled="s.saving"
            @click="manager.status(row)"
            >{{ row.status === "ACTIVE" ? "停用" : "启用" }}</Button
          ><Button
            size="sm"
            variant="text"
            :disabled="s.saving"
            @click="manager.open('password', row)"
            >重置密码</Button
          >
        </div></template
      ></DataTable
    >
    <template #footer
      ><Pagination
        :model-value="s.page"
        :total="s.total"
        :page-size="DEFAULT_PAGE_SIZE"
        @update:model-value="
          s.page = $event;
          manager.load();
        "
    /></template>
    <template #overlay
      ><Dialog
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
        variant="modal"
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
              ><Button
                variant="text"
                :disabled="s.saving"
                @click="manager.audit"
                >操作记录</Button
              >
            </div>
            <div v-for="item in s.audit" :key="item.id" class="body-sm">
              {{ time(item.createdAt) }} ·
              {{ item.actorName ?? "历史操作者" }} ·
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
      ></template
    >
  </BackofficePage>
</template>
