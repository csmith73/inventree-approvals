# InvenTree Purchase Order Approvals Plugin

A plugin for [InvenTree](https://inventree.org) that adds an approval workflow to Purchase Orders.

## Features

- **Single Approval Workflow**: Each Purchase Order requires one approval before it can be placed
- **Approvals Tab**: Custom UI panel on Purchase Order detail pages showing approval status
- **Specific Approvers**: Request approval from specific users
- **High-Value Order Restrictions**: Configure certain users as senior approvers for high-value orders
- **Email Notifications**: Automated email notifications when approval is requested
- **Conditional Actions**: "Place Order" button only available after approval is granted
- **Re-request Support**: Rejected approvals can be re-requested

## Installation

### Via InvenTree GUI (recommended)

1. In InvenTree, go to **Settings** → **Plugin Settings** → **Install Plugin**
2. Fill in the following:
   - **Package Name**: `inventree-approvals`
   - **Source URL**: `git+https://github.com/csmith73/inventree-approvals.git`
   - **Version**: Leave blank for latest
3. Toggle **Confirm plugin installation** to ON
4. Click **Install**
5. The server will restart to apply the plugin

### Via pip

```bash
pip install git+https://github.com/csmith73/inventree-approvals.git
```

### From source (development)

```bash
git clone https://github.com/csmith73/inventree-approvals.git
cd inventree-approvals
pip install -e .
```

### Enable the Plugin

1. Navigate to InvenTree Admin -> Plugins
2. Find "PO Approvals Plugin" and enable it
3. Configure the plugin settings

## Configuration

| Setting | Description | Default |
|---------|-------------|---------|
| Enable Approvals | Turn the approval workflow on/off | True |
| High Value Threshold | Orders above this amount require a senior approver | 10000 |
| Senior Approvers | Comma-separated usernames who can approve high-value orders | (empty) |
| Send Email Notifications | Send email when approval is requested | True |
| Teams Webhook URL | Microsoft Teams incoming webhook URL for posting approval requests | (empty) |

### Senior Approvers Setting

To specify which users can approve high-value orders, enter their usernames as a comma-separated list:

```
admin, manager, finance_lead
```

When a Purchase Order's total value exceeds the High Value Threshold, only these users will be shown in the approver selection dropdown.

### Teams Integration

For non-high-value orders, you can post approval requests to a Microsoft Teams channel. To set this up:

1. In Microsoft Teams, go to the channel where you want notifications
2. Click the `...` menu → **Connectors** → **Incoming Webhook**
3. Give it a name (e.g., "InvenTree Approvals") and click **Create**
4. Copy the webhook URL
5. Paste it into the plugin's **Teams Webhook URL** setting

When requesting approval for a non-high-value order, you'll see a "📢 Teams Purchasing Channel" option in the approver dropdown. Selecting this will post a message to the Teams channel:

```
Requesting approval for PO-0001-Acme Corp: https://inventree.example.com/purchasing/purchase-order/123
```

Anyone with access to the channel can then view and approve the order.

## Usage

### Requesting Approval

1. Navigate to a Purchase Order in PENDING status
2. Click the "Approvals" tab
3. Click "Request Approval"
4. Optionally select a specific approver (for high-value orders, only senior approvers are shown)
5. Submit the request

### Approving/Rejecting

1. Open a Purchase Order where you have a pending approval request
2. Click the "Approvals" tab
3. Click "Approve" or "Reject"
4. Add optional notes
5. Submit

### Placing an Order

Once the approval is granted, the "Place Order" button becomes available on the Purchase Order page.

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/plugin/approvals/po/<pk>/status/` | GET | Get approval status |
| `/plugin/approvals/po/<pk>/request/` | POST | Request an approval |
| `/plugin/approvals/po/<pk>/approve/` | POST | Approve pending request |
| `/plugin/approvals/po/<pk>/reject/` | POST | Reject pending request |
| `/plugin/approvals/pending/` | GET | List your pending approvals |
| `/plugin/approvals/users/` | GET | List available approvers |

### Users Endpoint Query Parameters

The `/plugin/approvals/users/` endpoint accepts:

| Parameter | Description |
|-----------|-------------|
| `is_high_value=true` | Filter to only show senior approvers |

## License

MIT License - see LICENSE file for details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
