import { jsx as e, jsxs as i, Fragment as V } from "react/jsx-runtime";
import { checkPluginVersion as G } from "@inventreedb/ui";
import { useState as d, useEffect as L, useCallback as M } from "react";
import { Text as A, Table as a, Badge as I, Stack as k, Modal as N, LoadingOverlay as F, Alert as j, Select as U, Textarea as H, Group as R, Button as w, Loader as W, Paper as X } from "@mantine/core";
import { IconAlertCircle as x, IconAlertTriangle as E, IconFileDescription as J, IconCheck as P, IconX as K } from "@tabler/icons-react";
function Q(r) {
  switch (r) {
    case "approved":
      return { color: "green", label: "✓ Approved" };
    case "rejected":
      return { color: "red", label: "✗ Rejected" };
    case "pending":
      return { color: "yellow", label: "⏳ Pending" };
    default:
      return { color: "gray", label: r };
  }
}
function B(r) {
  if (!r) return "-";
  try {
    return new Date(r).toLocaleString();
  } catch {
    return r;
  }
}
function Y({ approvals: r }) {
  if (r.length === 0)
    return /* @__PURE__ */ e(A, { c: "dimmed", fs: "italic", size: "sm", children: "No approvals yet" });
  const s = r.map((t, u) => {
    const { color: _, label: c } = Q(t.status);
    return /* @__PURE__ */ i(a.Tr, { children: [
      /* @__PURE__ */ i(a.Td, { children: [
        "Level ",
        t.level
      ] }),
      /* @__PURE__ */ e(a.Td, { children: /* @__PURE__ */ e(I, { color: _, variant: "filled", size: "sm", children: c }) }),
      /* @__PURE__ */ e(a.Td, { children: t.requested_by_name || "-" }),
      /* @__PURE__ */ e(a.Td, { children: t.status === "pending" ? t.requested_approver_name || "Any" : t.actual_approver_name || "-" }),
      /* @__PURE__ */ e(a.Td, { children: /* @__PURE__ */ e(A, { size: "xs", c: "dimmed", children: B(t.requested_at) }) }),
      /* @__PURE__ */ e(a.Td, { children: /* @__PURE__ */ e(A, { size: "xs", c: "dimmed", children: t.status !== "pending" ? B(t.decided_at) : "-" }) })
    ] }, u);
  });
  return /* @__PURE__ */ i(k, { gap: "xs", children: [
    /* @__PURE__ */ e(A, { fw: 500, size: "sm", children: "Approval History" }),
    /* @__PURE__ */ i(a, { striped: !0, highlightOnHover: !0, withTableBorder: !0, withColumnBorders: !0, children: [
      /* @__PURE__ */ e(a.Thead, { children: /* @__PURE__ */ i(a.Tr, { children: [
        /* @__PURE__ */ e(a.Th, { children: "Level" }),
        /* @__PURE__ */ e(a.Th, { children: "Status" }),
        /* @__PURE__ */ e(a.Th, { children: "Requested By" }),
        /* @__PURE__ */ e(a.Th, { children: "Approver" }),
        /* @__PURE__ */ e(a.Th, { children: "Requested" }),
        /* @__PURE__ */ e(a.Th, { children: "Decided" })
      ] }) }),
      /* @__PURE__ */ e(a.Tbody, { children: s })
    ] })
  ] });
}
function Z({
  opened: r,
  onClose: s,
  onSuccess: t,
  orderId: u,
  pluginSlug: _,
  isHighValue: c,
  context: T
}) {
  const [m, l] = d(!1), [q, p] = d(null), [z, y] = d([]), [S, C] = d(null), [$, b] = d("");
  L(() => {
    r && (p(null), f());
  }, [r]);
  async function f() {
    var n;
    try {
      const o = c ? "?is_high_value=true" : "", v = await ((n = T.api) == null ? void 0 : n.get(
        `plugin/${_}/users/${o}`
      )), O = v == null ? void 0 : v.data;
      y((O == null ? void 0 : O.results) || []);
    } catch (o) {
      console.error("Failed to load approvers:", o), y([]);
    }
  }
  async function h() {
    var n;
    l(!0), p(null);
    try {
      const o = await ((n = T.api) == null ? void 0 : n.post(
        `plugin/${_}/po/${u}/request/`,
        {
          approver_id: S,
          notes: $
        }
      )), v = o == null ? void 0 : o.data;
      v != null && v.success ? (b(""), C(null), t(), s()) : p((v == null ? void 0 : v.error) || "Failed to request approval");
    } catch (o) {
      p(o instanceof Error ? o.message : "An error occurred");
    } finally {
      l(!1);
    }
  }
  const g = [
    { value: "", label: "-- Any Available Approver --" },
    ...c ? [] : [{ value: "teams_channel", label: "📢 Teams Purchasing Channel" }],
    ...z.map((n) => ({
      value: String(n.id),
      label: `${n.full_name} (${n.username})`
    }))
  ];
  return /* @__PURE__ */ i(N, { opened: r, onClose: s, title: "Request Approval", size: "md", children: [
    /* @__PURE__ */ e(F, { visible: m }),
    /* @__PURE__ */ i(k, { gap: "md", children: [
      q && /* @__PURE__ */ e(j, { color: "red", icon: /* @__PURE__ */ e(x, { size: 16 }), children: q }),
      /* @__PURE__ */ e(
        U,
        {
          label: "Select Approver (optional)",
          placeholder: "Select an approver",
          data: g,
          value: S,
          onChange: C,
          clearable: !0
        }
      ),
      /* @__PURE__ */ e(
        H,
        {
          label: "Notes (optional)",
          placeholder: "Add any notes for the approver",
          value: $,
          onChange: (n) => b(n.currentTarget.value),
          rows: 3
        }
      ),
      /* @__PURE__ */ i(R, { justify: "flex-end", gap: "sm", children: [
        /* @__PURE__ */ e(w, { variant: "default", onClick: s, children: "Cancel" }),
        /* @__PURE__ */ e(w, { onClick: h, loading: m, children: "Submit Request" })
      ] })
    ] })
  ] });
}
function D({
  opened: r,
  onClose: s,
  onSuccess: t,
  orderId: u,
  pluginSlug: _,
  isApprove: c,
  context: T
}) {
  const [m, l] = d(!1), [q, p] = d(null), [z, y] = d("");
  L(() => {
    r && (p(null), y(""));
  }, [r]);
  async function S() {
    var f;
    l(!0), p(null);
    try {
      const h = c ? "approve" : "reject", g = await ((f = T.api) == null ? void 0 : f.post(
        `plugin/${_}/po/${u}/${h}/`,
        { notes: z }
      )), n = g == null ? void 0 : g.data;
      n != null && n.success ? (y(""), t(), s()) : p((n == null ? void 0 : n.error) || `Failed to ${c ? "approve" : "reject"}`);
    } catch (h) {
      p(h instanceof Error ? h.message : "An error occurred");
    } finally {
      l(!1);
    }
  }
  return /* @__PURE__ */ i(N, { opened: r, onClose: s, title: c ? "Approve Request" : "Reject Request", size: "md", children: [
    /* @__PURE__ */ e(F, { visible: m }),
    /* @__PURE__ */ i(k, { gap: "md", children: [
      q && /* @__PURE__ */ e(j, { color: "red", icon: /* @__PURE__ */ e(x, { size: 16 }), children: q }),
      /* @__PURE__ */ e(
        H,
        {
          label: "Notes (optional)",
          placeholder: `Add any notes for ${c ? "approving" : "rejecting"} this request`,
          value: z,
          onChange: (f) => y(f.currentTarget.value),
          rows: 3
        }
      ),
      /* @__PURE__ */ i(R, { justify: "flex-end", gap: "sm", children: [
        /* @__PURE__ */ e(w, { variant: "default", onClick: s, children: "Cancel" }),
        /* @__PURE__ */ e(w, { color: c ? "green" : "red", onClick: S, loading: m, children: c ? "Approve" : "Reject" })
      ] })
    ] })
  ] });
}
function ee({ context: r }) {
  const s = r.context, t = (s == null ? void 0 : s.order_id) || r.id, u = (s == null ? void 0 : s.plugin_slug) || "approvals", [_, c] = d(!0), [T, m] = d(null), [l, q] = d(null), [p, z] = d(!1), [y, S] = d(!1), [C, $] = d(!1), b = M(async () => {
    var n;
    if (!t) {
      m("No order ID provided"), c(!1);
      return;
    }
    try {
      c(!0), m(null);
      const o = await ((n = r.api) == null ? void 0 : n.get(`plugin/${u}/po/${t}/status/`));
      q(o == null ? void 0 : o.data);
    } catch (o) {
      m(o instanceof Error ? o.message : "Failed to load approval status");
    } finally {
      c(!1);
    }
  }, [t, u, r.api]);
  L(() => {
    b();
  }, [b]);
  const f = M(() => {
    b();
  }, [b]);
  if (_ && !l)
    return /* @__PURE__ */ i(k, { align: "center", p: "md", children: [
      /* @__PURE__ */ e(W, { size: "md" }),
      /* @__PURE__ */ e(A, { size: "sm", c: "dimmed", children: "Loading approval status..." })
    ] });
  if (T && !l)
    return /* @__PURE__ */ e(j, { color: "red", title: "Error", icon: /* @__PURE__ */ e(E, { size: 16 }), children: T });
  if (!l)
    return /* @__PURE__ */ e(j, { color: "yellow", title: "No Data", children: "Unable to load approval status" });
  let h, g;
  return l.is_fully_approved ? (h = "green", g = "✓ Approved") : l.has_pending ? (h = "yellow", g = `${l.approved_count}/${l.total_required} (Pending)`) : (h = "blue", g = `${l.approved_count}/${l.total_required}`), /* @__PURE__ */ i(k, { gap: "md", p: "md", children: [
    /* @__PURE__ */ i(R, { justify: "space-between", align: "center", children: [
      /* @__PURE__ */ e(A, { fw: 600, size: "lg", children: "Approval Status" }),
      /* @__PURE__ */ e(I, { color: h, variant: "filled", size: "lg", children: g })
    ] }),
    l.is_high_value && /* @__PURE__ */ e(
      j,
      {
        color: "orange",
        icon: /* @__PURE__ */ e(E, { size: 16 }),
        title: "High Value Order",
        children: "This order requires approval from a senior approver"
      }
    ),
    /* @__PURE__ */ e(Y, { approvals: l.approvals }),
    /* @__PURE__ */ i(R, { gap: "sm", children: [
      l.can_request_approval && /* @__PURE__ */ e(
        w,
        {
          leftSection: /* @__PURE__ */ e(J, { size: 16 }),
          onClick: () => z(!0),
          children: "Request Approval"
        }
      ),
      l.user_can_approve && /* @__PURE__ */ i(V, { children: [
        /* @__PURE__ */ e(
          w,
          {
            color: "green",
            leftSection: /* @__PURE__ */ e(P, { size: 16 }),
            onClick: () => S(!0),
            children: "Approve"
          }
        ),
        /* @__PURE__ */ e(
          w,
          {
            color: "red",
            leftSection: /* @__PURE__ */ e(K, { size: 16 }),
            onClick: () => $(!0),
            children: "Reject"
          }
        )
      ] }),
      l.is_fully_approved && /* @__PURE__ */ e(X, { withBorder: !0, p: "sm", bg: "green.0", children: /* @__PURE__ */ i(R, { gap: "xs", children: [
        /* @__PURE__ */ e(P, { size: 16, color: "green" }),
        /* @__PURE__ */ e(A, { size: "sm", c: "green.8", fw: 500, children: "Order can now be placed" })
      ] }) })
    ] }),
    !l.can_request_approval && !l.user_can_approve && !l.is_fully_approved && /* @__PURE__ */ e(A, { size: "sm", c: "dimmed", children: l.can_request_reason || l.user_can_approve_reason || "Waiting for approval action" }),
    /* @__PURE__ */ e(
      Z,
      {
        opened: p,
        onClose: () => z(!1),
        onSuccess: f,
        orderId: t,
        pluginSlug: u,
        isHighValue: l.is_high_value,
        context: r
      }
    ),
    /* @__PURE__ */ e(
      D,
      {
        opened: y,
        onClose: () => S(!1),
        onSuccess: f,
        orderId: t,
        pluginSlug: u,
        isApprove: !0,
        context: r
      }
    ),
    /* @__PURE__ */ e(
      D,
      {
        opened: C,
        onClose: () => $(!1),
        onSuccess: f,
        orderId: t,
        pluginSlug: u,
        isApprove: !1,
        context: r
      }
    )
  ] });
}
function ae(r) {
  return G(r), /* @__PURE__ */ e(ee, { context: r });
}
function ie(r) {
  return r.model !== "purchaseorder";
}
export {
  ie as isPanelHidden,
  ae as renderPanel
};
//# sourceMappingURL=approvals_panel.js.map
