import { Modal, Typography } from 'antd';

interface ConfirmDeleteModalProps {
  open: boolean;
  title?: string;
  subject?: string;
  description?: string;
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export function ConfirmDeleteModal({
  open,
  title = 'Confirmar eliminación',
  subject,
  description,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDeleteModalProps) {
  return (
    <Modal
      open={open}
      title={title}
      okText="Eliminar"
      cancelText="Cancelar"
      okButtonProps={{ danger: true, loading }}
      cancelButtonProps={{ disabled: loading }}
      closable={!loading}
      maskClosable={!loading}
      onOk={onConfirm}
      onCancel={onCancel}
      destroyOnHidden
    >
      <Typography.Paragraph>
        {description ?? (
          <>
            Esta acción eliminará {subject ? <Typography.Text strong>{subject}</Typography.Text> : 'el registro'}.
            No se puede deshacer.
          </>
        )}
      </Typography.Paragraph>
    </Modal>
  );
}
