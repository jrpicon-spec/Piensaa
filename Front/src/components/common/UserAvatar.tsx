import { Avatar } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import { getInitials } from '@/utils';

interface UserAvatarProps {
  name?: string;
  src?: string;
  size?: number | 'large' | 'small' | 'default';
}

export function UserAvatar({ name, src, size = 'default' }: UserAvatarProps) {
  return (
    <Avatar src={src} size={size} icon={!name ? <UserOutlined /> : undefined}>
      {name ? getInitials(name) : null}
    </Avatar>
  );
}
