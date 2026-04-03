import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  Table,
  Tabs,
  Statistic,
  Row,
  Col,
  Form,
  Input,
  InputNumber,
  Select,
  Button,
  Typography,
  Tag,
  Space,
  Upload,
  message,
} from "antd";
import {
  WalletOutlined,
  HistoryOutlined,
  LineChartOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { billingService } from "../../services/billing.service";
import type {
  PaymentRecord,
  UsageLogItem,
} from "../../services/billing.service";
import { cloudinaryService } from "../../services/cloudinary.service";
import { useState } from "react";

const { Title, Text } = Typography;

const paymentTypeOptions = [
  { value: "UPI", label: "UPI" },
  { value: "BANK_TRANSFER", label: "Bank transfer" },
  { value: "CARD", label: "Card" },
  { value: "RAZORPAY", label: "Razorpay" },
  { value: "OTHER", label: "Other" },
];

function statusColor(status: string) {
  switch (status) {
    case "VERIFIED":
      return "green";
    case "PENDING":
      return "gold";
    case "REJECTED":
      return "red";
    case "FAILED":
      return "default";
    default:
      return "blue";
  }
}

export function BillingPage() {
  const queryClient = useQueryClient();
  const [proofUploading, setProofUploading] = useState(false);
  const [form] = Form.useForm();

  const balanceQuery = useQuery({
    queryKey: ["billing", "balance"],
    queryFn: () => billingService.getBalance(),
  });

  const usageQuery = useQuery({
    queryKey: ["billing", "usage"],
    queryFn: () => billingService.getUsage({ limit: 100, offset: 0 }),
  });

  const paymentsQuery = useQuery({
    queryKey: ["billing", "payments"],
    queryFn: () => billingService.getPayments({ limit: 100, offset: 0 }),
  });

  const createPayment = useMutation({
    mutationFn: billingService.createPayment,
    onSuccess: () => {
      message.success(
        "Payment record submitted. It will appear as Pending until verified.",
      );
      void queryClient.invalidateQueries({ queryKey: ["billing"] });
      form.resetFields();
    },
    onError: (err: unknown) => {
      const msg =
        err &&
        typeof err === "object" &&
        "response" in err &&
        err.response &&
        typeof err.response === "object" &&
        "data" in err.response &&
        err.response.data &&
        typeof err.response.data === "object" &&
        "message" in err.response.data
          ? String(
              (err.response.data as { message?: string }).message ??
                "Request failed",
            )
          : "Could not submit payment";
      message.error(msg);
    },
  });

  const usageColumns: ColumnsType<UsageLogItem> = [
    { title: "When", dataIndex: "createdAt", key: "createdAt", width: 200 },
    { title: "Action", dataIndex: "action", key: "action" },
    {
      title: "Units",
      dataIndex: "units",
      key: "units",
      width: 90,
    },
    {
      title: "Cost / unit",
      dataIndex: "costPerUnit",
      key: "costPerUnit",
      render: (v: number) => `₹${v.toFixed(2)}`,
    },
    {
      title: "Total",
      dataIndex: "totalCost",
      key: "totalCost",
      render: (v: number) => `₹${v.toFixed(2)}`,
    },
  ];

  const paymentColumns: ColumnsType<PaymentRecord> = [
    {
      title: "Date",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 180,
    },
    {
      title: "Reference",
      dataIndex: "referenceCode",
      key: "referenceCode",
      width: 160,
    },
    {
      title: "Type",
      dataIndex: "paymentType",
      key: "paymentType",
      width: 120,
    },
    {
      title: "Amount",
      dataIndex: "amount",
      key: "amount",
      render: (v: number, row) =>
        `${row.currency === "INR" ? "₹" : row.currency + " "}${v.toFixed(2)}`,
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 110,
      render: (s: string) => <Tag color={statusColor(s)}>{s}</Tag>,
    },
    {
      title: "Remark",
      dataIndex: "remark",
      key: "remark",
      ellipsis: true,
    },
  ];

  const balance = balanceQuery.data;

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      <Title level={2} style={{ color: "#800000", marginBottom: 24 }}>
        Billing & payments
      </Title>

      <Tabs
        defaultActiveKey="overview"
        items={[
          {
            key: "overview",
            label: (
              <span>
                <WalletOutlined /> Balance
              </span>
            ),
            children: (
              <Space
                direction="vertical"
                size="large"
                style={{ width: "100%" }}
              >
                <Row gutter={[16, 16]}>
                  <Col xs={24} md={8}>
                    <Card loading={balanceQuery.isLoading}>
                      <Statistic
                        title="Current balance"
                        value={balance?.balance ?? 0}
                        precision={2}
                        prefix="₹"
                        valueStyle={{ color: "#800000" }}
                      />
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        Negative means usage owed (postpaid). Positive means
                        credit on file.
                      </Text>
                    </Card>
                  </Col>
                  <Col xs={24} md={8}>
                    <Card loading={balanceQuery.isLoading}>
                      <Statistic
                        title="Pending payments"
                        value={balance?.pendingPayments?.count ?? 0}
                      />
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        Total pending amount: ₹
                        {(balance?.pendingPayments?.totalAmount ?? 0).toFixed(
                          2,
                        )}
                      </Text>
                    </Card>
                  </Col>
                  <Col xs={24} md={8}>
                    <Card loading={balanceQuery.isLoading}>
                      <Statistic
                        title="Credit limit"
                        value={
                          balance?.creditLimit != null
                            ? balance.creditLimit
                            : "—"
                        }
                      />
                    </Card>
                  </Col>
                </Row>

                <Card title="Record a payment (proof)">
                  <Form
                    form={form}
                    layout="vertical"
                    onFinish={async (values) => {
                      let transactionDetails:
                        | Record<string, unknown>
                        | undefined;
                      if (
                        values.transactionDetailsJson &&
                        String(values.transactionDetailsJson).trim()
                      ) {
                        try {
                          transactionDetails = JSON.parse(
                            values.transactionDetailsJson as string,
                          ) as Record<string, unknown>;
                        } catch {
                          message.error(
                            "Transaction details must be valid JSON",
                          );
                          return;
                        }
                      }
                      await createPayment.mutateAsync({
                        amount: values.amount as number,
                        currency: "INR",
                        remark: values.remark as string | undefined,
                        image: values.imageUrl as string | undefined,
                        paymentType: values.paymentType as string,
                        transactionDetails,
                      });
                    }}
                  >
                    <Row gutter={16}>
                      <Col xs={24} md={8}>
                        <Form.Item
                          name="amount"
                          label="Amount (INR)"
                          rules={[{ required: true, message: "Enter amount" }]}
                        >
                          <InputNumber
                            min={0.01}
                            step={0.01}
                            style={{ width: "100%" }}
                            placeholder="0.00"
                          />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={8}>
                        <Form.Item
                          name="paymentType"
                          label="Payment type"
                          rules={[{ required: true, message: "Select type" }]}
                          initialValue="UPI"
                        >
                          <Select options={paymentTypeOptions} />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={8}>
                        <Form.Item name="imageUrl" label="Proof image URL">
                          <Input placeholder="Optional — upload below" />
                        </Form.Item>
                      </Col>
                    </Row>
                    <Form.Item
                      label="Upload proof (optional)"
                      extra="JPEG/PNG/WebP/GIF, max 5MB"
                    >
                      <Upload
                        accept="image/*"
                        maxCount={1}
                        showUploadList
                        beforeUpload={async (file) => {
                          const v = cloudinaryService.validateImageFile(file);
                          if (!v.valid) {
                            message.error(v.error ?? "Invalid file");
                            return Upload.LIST_IGNORE;
                          }
                          setProofUploading(true);
                          const result = await cloudinaryService.uploadFile(
                            file,
                            { folder: "payment-proofs" },
                          );
                          setProofUploading(false);
                          if (result?.secure_url) {
                            form.setFieldValue("imageUrl", result.secure_url);
                            message.success("Image uploaded");
                          }
                          return false;
                        }}
                      >
                        <Button
                          icon={<UploadOutlined />}
                          loading={proofUploading}
                        >
                          Upload to Cloudinary
                        </Button>
                      </Upload>
                    </Form.Item>
                    <Form.Item name="remark" label="Remark">
                      <Input.TextArea
                        rows={2}
                        placeholder="UPI ref, bank ref, etc."
                      />
                    </Form.Item>
                    <Form.Item
                      name="transactionDetailsJson"
                      label="Transaction details (JSON, optional)"
                    >
                      <Input.TextArea
                        rows={3}
                        placeholder='e.g. {"utr":"..."}'
                      />
                    </Form.Item>
                    <Button
                      type="primary"
                      htmlType="submit"
                      loading={createPayment.isPending}
                      style={{ background: "#800000" }}
                    >
                      Submit payment record
                    </Button>
                  </Form>
                </Card>
              </Space>
            ),
          },
          {
            key: "usage",
            label: (
              <span>
                <LineChartOutlined /> Usage log
              </span>
            ),
            children: (
              <Card>
                <Table<UsageLogItem>
                  rowKey="id"
                  loading={usageQuery.isLoading}
                  columns={usageColumns}
                  dataSource={usageQuery.data?.items ?? []}
                  pagination={false}
                  scroll={{ x: true }}
                />
              </Card>
            ),
          },
          {
            key: "payments",
            label: (
              <span>
                <HistoryOutlined /> Payment history
              </span>
            ),
            children: (
              <Card>
                <Table<PaymentRecord>
                  rowKey="id"
                  loading={paymentsQuery.isLoading}
                  columns={paymentColumns}
                  dataSource={paymentsQuery.data?.items ?? []}
                  pagination={false}
                  scroll={{ x: true }}
                  expandable={{
                    expandedRowRender: (row) => (
                      <div style={{ padding: 8, fontSize: 12 }}>
                        {row.image && (
                          <div style={{ marginBottom: 8 }}>
                            <Text strong>Proof: </Text>
                            <a
                              href={row.image}
                              target="_blank"
                              rel="noreferrer"
                            >
                              {row.image}
                            </a>
                          </div>
                        )}
                        <div>
                          <Text type="secondary">
                            Metadata / transaction details are stored for
                            reconciliation.
                          </Text>
                        </div>
                      </div>
                    ),
                    rowExpandable: (row) => Boolean(row.image || row.metadata),
                  }}
                />
              </Card>
            ),
          },
        ]}
      />
    </div>
  );
}
