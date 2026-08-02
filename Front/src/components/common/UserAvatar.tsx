import { Avatar } from 'antd';
import { User as UserOutlined } from 'lucide-react';
import { getInitials } from '@/utils';

interface UserAvatarProps {
  name?: string;
  src?: string;
  size?: number | 'large' | 'small' | 'default';
}

export function UserAvatar({ name, src, size = 'default' }: UserAvatarProps) {
  return (
    <Avatar src={src} size={size} icon={!name ? <UserOutlined size={16} /> : undefined}>
      {name ? getInitials(name) : null}
    </Avatar>
  );
}
