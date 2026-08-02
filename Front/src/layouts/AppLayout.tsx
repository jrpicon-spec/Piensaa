import { Layout } from 'antd';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import './app-layout.css';

const { Content } = Layout;

export function AppLayout() {
  return (
    <Layout className="rv-app-shell">
      <Sidebar />
      <Layout className="rv-app-main">
        <Topbar />
        <Content className="rv-content" id="main-content">
          <div className="rv-content__inner">
            <Outlet />
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}
