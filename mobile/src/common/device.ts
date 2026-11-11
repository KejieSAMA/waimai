export function switchDevice(mobile: boolean) {
  localStorage.setItem("xz-device", mobile ? "mobile" : "desktop");
  const current = location.pathname.replace(/^\/mobile(?=\/|$)/, "") || "/";
  let path = current;
  if (current === "/merchant/dashboard") path = "/merchant";
  if (current === "/admin/overview") path = "/admin";
  if (current.endsWith("/me"))
    path = current.startsWith("/merchant")
      ? "/merchant"
      : current.startsWith("/admin")
        ? "/admin"
        : "/";
  location.href = (mobile ? "/mobile" : "") + path + location.search;
}
