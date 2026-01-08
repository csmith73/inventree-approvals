import { useState as c, useEffect as L, useCallback as N, createElement as G } from "react";
import X from "react-dom";
import { jsx as e, jsxs as s, Fragment as Y } from "react/jsx-runtime";
import { Text as y, Table as a, Badge as F, Stack as E, Modal as H, LoadingOverlay as U, Alert as w, Select as J, Textarea as W, Group as z, Button as b, Loader as K, Paper as Q } from "@mantine/core";
import { IconAlertCircle as V, IconAlertTriangle as k, IconFileDescription as Z, IconCheck as D, IconX as ee } from "@tabler/icons-react";
var x, j = X;
if (process.env.NODE_ENV === "production")
  x = j.createRoot, j.hydrateRoot;
else {
  var I = j.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED;
  x = function(r, o) {
    I.usingClientEntryPoint = !0;
    try {
      return j.createRoot(r, o);
    } finally {
      I.usingClientEntryPoint = !1;
    }
  };
}
function re(r) {
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
function M(r) {
  if (!r) return "-";
  try {
    return new Date(r).toLocaleString();
  } catch {
    return r;
  }
}
function ne({ approvals: r }) {
  if (r.length === 0)
    return /* @__PURE__ */ e(y, { c: "dimmed", fs: "italic", size: "sm", children: "No approvals yet" });
  const o = r.map((t, i) => {
    const { color: p, label: d } = re(t.status);
    return /* @__PURE__ */ s(a.Tr, { children: [
      /* @__PURE__ */ s(a.Td, { children: [
        "Level ",
        t.level
      ] }),
      /* @__PURE__ */ e(a.Td, { children: /* @__PURE__ */ e(F, { color: p, variant: "filled", size: "sm", children: d }) }),
      /* @__PURE__ */ e(a.Td, { children: t.requested_by_name || "-" }),
      /* @__PURE__ */ e(a.Td, { children: t.status === "pending" ? t.requested_approver_name || "Any" : t.actual_approver_name || "-" }),
      /* @__PURE__ */ e(a.Td, { children: /* @__PURE__ */ e(y, { size: "xs", c: "dimmed", children: M(t.requested_at) }) }),
      /* @__PURE__ */ e(a.Td, { children: /* @__PURE__ */ e(y, { size: "xs", c: "dimmed", children: t.status !== "pending" ? M(t.decided_at) : "-" }) })
    ] }, i);
  });
  return /* @__PURE__ */ s(E, { gap: "xs", children: [
    /* @__PURE__ */ e(y, { fw: 500, size: "sm", children: "Approval History" }),
    /* @__PURE__ */ s(a, { striped: !0, highlightOnHover: !0, withTableBorder: !0, withColumnBorders: !0, children: [
      /* @__PURE__ */ e(a.Thead, { children: /* @__PURE__ */ s(a.Tr, { children: [
        /* @__PURE__ */ e(a.Th, { children: "Level" }),
        /* @__PURE__ */ e(a.Th, { children: "Status" }),
        /* @__PURE__ */ e(a.Th, { children: "Requested By" }),
        /* @__PURE__ */ e(a.Th, { children: "Approver" }),
        /* @__PURE__ */ e(a.Th, { children: "Requested" }),
        /* @__PURE__ */ e(a.Th, { children: "Decided" })
      ] }) }),
      /* @__PURE__ */ e(a.Tbody, { children: o })
    ] })
  ] });
}
function te({
  opened: r,
  onClose: o,
  onSuccess: t,
  orderId: i,
  pluginSlug: p,
  isHighValue: d,
  api: v
}) {
  const [m, f] = c(!1), [n, h] = c(null), [T, g] = c([]), [A, S] = c(null), [C, q] = c("");
  L(() => {
    r && (h(null), u());
  }, [r]);
  async function u() {
    try {
      const l = d ? "?is_high_value=true" : "", $ = await v.get(
        `/plugin/${p}/users/${l}`
      );
      g($.results);
    } catch (l) {
      console.error("Failed to load approvers:", l), g([]);
    }
  }
  async function _() {
    f(!0), h(null);
    try {
      const l = await v.post(
        `/plugin/${p}/po/${i}/request/`,
        {
          approver_id: A,
          notes: C
        }
      );
      l.success ? (q(""), S(null), t(), o()) : h(l.error || "Failed to request approval");
    } catch (l) {
      h(l instanceof Error ? l.message : "An error occurred");
    } finally {
      f(!1);
    }
  }
  const R = [
    { value: "", label: "-- Any Available Approver --" },
    ...d ? [] : [{ value: "teams_channel", label: "📢 Teams Purchasing Channel" }],
    ...T.map((l) => ({
      value: String(l.id),
      label: `${l.full_name} (${l.username})`
    }))
  ];
  return /* @__PURE__ */ s(H, { opened: r, onClose: o, title: "Request Approval", size: "md", children: [
    /* @__PURE__ */ e(U, { visible: m }),
    /* @__PURE__ */ s(E, { gap: "md", children: [
      n && /* @__PURE__ */ e(w, { color: "red", icon: /* @__PURE__ */ e(V, { size: 16 }), children: n }),
      /* @__PURE__ */ e(
        J,
        {
          label: "Select Approver (optional)",
          placeholder: "Select an approver",
          data: R,
          value: A,
          onChange: S,
          clearable: !0
        }
      ),
      /* @__PURE__ */ e(
        W,
        {
          label: "Notes (optional)",
          placeholder: "Add any notes for the approver",
          value: C,
          onChange: (l) => q(l.currentTarget.value),
          rows: 3
        }
      ),
      /* @__PURE__ */ s(z, { justify: "flex-end", gap: "sm", children: [
        /* @__PURE__ */ e(b, { variant: "default", onClick: o, children: "Cancel" }),
        /* @__PURE__ */ e(b, { onClick: _, loading: m, children: "Submit Request" })
      ] })
    ] })
  ] });
}
function P({
  opened: r,
  onClose: o,
  onSuccess: t,
  orderId: i,
  pluginSlug: p,
  isApprove: d,
  api: v
}) {
  const [m, f] = c(!1), [n, h] = c(null), [T, g] = c("");
  L(() => {
    r && (h(null), g(""));
  }, [r]);
  async function A() {
    f(!0), h(null);
    try {
      const u = d ? "approve" : "reject", _ = await v.post(
        `/plugin/${p}/po/${i}/${u}/`,
        { notes: T }
      );
      _.success ? (g(""), t(), o()) : h(_.error || `Failed to ${d ? "approve" : "reject"}`);
    } catch (u) {
      h(u instanceof Error ? u.message : "An error occurred");
    } finally {
      f(!1);
    }
  }
  return /* @__PURE__ */ s(H, { opened: r, onClose: o, title: d ? "Approve Request" : "Reject Request", size: "md", children: [
    /* @__PURE__ */ e(U, { visible: m }),
    /* @__PURE__ */ s(E, { gap: "md", children: [
      n && /* @__PURE__ */ e(w, { color: "red", icon: /* @__PURE__ */ e(V, { size: 16 }), children: n }),
      /* @__PURE__ */ e(
        W,
        {
          label: "Notes (optional)",
          placeholder: `Add any notes for ${d ? "approving" : "rejecting"} this request`,
          value: T,
          onChange: (u) => g(u.currentTarget.value),
          rows: 3
        }
      ),
      /* @__PURE__ */ s(z, { justify: "flex-end", gap: "sm", children: [
        /* @__PURE__ */ e(b, { variant: "default", onClick: o, children: "Cancel" }),
        /* @__PURE__ */ e(b, { color: d ? "green" : "red", onClick: A, loading: m, children: d ? "Approve" : "Reject" })
      ] })
    ] })
  ] });
}
function oe(r) {
  var $;
  const { context: o, api: t } = r, i = (o == null ? void 0 : o.order_id) || (($ = r.target) == null ? void 0 : $.id), p = (o == null ? void 0 : o.plugin_slug) || "approvals", [d, v] = c(!0), [m, f] = c(null), [n, h] = c(null), [T, g] = c(!1), [A, S] = c(!1), [C, q] = c(!1), u = N(async () => {
    if (!i) {
      f("No order ID provided"), v(!1);
      return;
    }
    try {
      v(!0), f(null);
      const O = await t.get(
        `/plugin/${p}/po/${i}/status/`
      );
      h(O);
    } catch (O) {
      f(O instanceof Error ? O.message : "Failed to load approval status");
    } finally {
      v(!1);
    }
  }, [i, p, t]);
  L(() => {
    u();
  }, [u]);
  const _ = N(() => {
    u();
  }, [u]);
  if (d && !n)
    return /* @__PURE__ */ s(E, { align: "center", p: "md", children: [
      /* @__PURE__ */ e(K, { size: "md" }),
      /* @__PURE__ */ e(y, { size: "sm", c: "dimmed", children: "Loading approval status..." })
    ] });
  if (m && !n)
    return /* @__PURE__ */ e(w, { color: "red", title: "Error", icon: /* @__PURE__ */ e(k, { size: 16 }), children: m });
  if (!n)
    return /* @__PURE__ */ e(w, { color: "yellow", title: "No Data", children: "Unable to load approval status" });
  let R, l;
  return n.is_fully_approved ? (R = "green", l = "✓ Approved") : n.has_pending ? (R = "yellow", l = `${n.approved_count}/${n.total_required} (Pending)`) : (R = "blue", l = `${n.approved_count}/${n.total_required}`), /* @__PURE__ */ s(E, { gap: "md", p: "md", children: [
    /* @__PURE__ */ s(z, { justify: "space-between", align: "center", children: [
      /* @__PURE__ */ e(y, { fw: 600, size: "lg", children: "Approval Status" }),
      /* @__PURE__ */ e(F, { color: R, variant: "filled", size: "lg", children: l })
    ] }),
    n.is_high_value && /* @__PURE__ */ e(
      w,
      {
        color: "orange",
        icon: /* @__PURE__ */ e(k, { size: 16 }),
        title: "High Value Order",
        children: "This order requires approval from a senior approver"
      }
    ),
    /* @__PURE__ */ e(ne, { approvals: n.approvals }),
    /* @__PURE__ */ s(z, { gap: "sm", children: [
      n.can_request_approval && /* @__PURE__ */ e(
        b,
        {
          leftSection: /* @__PURE__ */ e(Z, { size: 16 }),
          onClick: () => g(!0),
          children: "Request Approval"
        }
      ),
      n.user_can_approve && /* @__PURE__ */ s(Y, { children: [
        /* @__PURE__ */ e(
          b,
          {
            color: "green",
            leftSection: /* @__PURE__ */ e(D, { size: 16 }),
            onClick: () => S(!0),
            children: "Approve"
          }
        ),
        /* @__PURE__ */ e(
          b,
          {
            color: "red",
            leftSection: /* @__PURE__ */ e(ee, { size: 16 }),
            onClick: () => q(!0),
            children: "Reject"
          }
        )
      ] }),
      n.is_fully_approved && /* @__PURE__ */ e(Q, { withBorder: !0, p: "sm", bg: "green.0", children: /* @__PURE__ */ s(z, { gap: "xs", children: [
        /* @__PURE__ */ e(D, { size: 16, color: "green" }),
        /* @__PURE__ */ e(y, { size: "sm", c: "green.8", fw: 500, children: "Order can now be placed" })
      ] }) })
    ] }),
    !n.can_request_approval && !n.user_can_approve && !n.is_fully_approved && /* @__PURE__ */ e(y, { size: "sm", c: "dimmed", children: n.can_request_reason || n.user_can_approve_reason || "Waiting for approval action" }),
    /* @__PURE__ */ e(
      te,
      {
        opened: T,
        onClose: () => g(!1),
        onSuccess: _,
        orderId: i,
        pluginSlug: p,
        isHighValue: n.is_high_value,
        api: t
      }
    ),
    /* @__PURE__ */ e(
      P,
      {
        opened: A,
        onClose: () => S(!1),
        onSuccess: _,
        orderId: i,
        pluginSlug: p,
        isApprove: !0,
        api: t
      }
    ),
    /* @__PURE__ */ e(
      P,
      {
        opened: C,
        onClose: () => q(!1),
        onSuccess: _,
        orderId: i,
        pluginSlug: p,
        isApprove: !1,
        api: t
      }
    )
  ] });
}
const B = /* @__PURE__ */ new WeakMap();
function le(r, o) {
  const t = B.get(r);
  t && t.unmount();
  const i = x(r);
  B.set(r, i), i.render(G(oe, o));
}
function ae(r) {
  return r.model !== "purchaseorder";
}
const pe = { renderPanel: le, isPanelHidden: ae };
export {
  pe as default,
  ae as isPanelHidden,
  le as renderPanel
};
//# sourceMappingURL=approvals_panel.js.map
