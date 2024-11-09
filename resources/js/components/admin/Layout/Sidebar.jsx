import React from 'react';
import {
    Drawer,
    List,
    Divider,
    ListItem,
    ListItemIcon,
    ListItemText,
    Avatar,
    Box,
} from '@mui/material';
import {
    Dashboard as DashboardIcon,
    People as PeopleIcon,
    BarChart as BarChartIcon,
    Settings as SettingsIcon,
    ExitToApp as LogoutIcon,
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';

const drawerWidth = 280;

const DrawerStyled = styled(Drawer, {
    shouldForwardProp: (prop) => prop !== 'open',
})(({ theme, open }) => ({
    '& .MuiDrawer-paper': {
        position: 'relative',
        whiteSpace: 'nowrap',
        width: drawerWidth,
        backgroundColor: theme.palette.primary.main,
        color: theme.palette.primary.contrastText,
        transition: theme.transitions.create('width', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
        }),
        boxSizing: 'border-box',
        ...(!open && {
            overflowX: 'hidden',
            transition: theme.transitions.create('width', {
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.leavingScreen,
            }),
            width: theme.spacing(7),
            [theme.breakpoints.up('sm')]: {
                width: theme.spacing(9),
            },
        }),
    },
}));

const MenuItemStyled = styled(ListItem)(({ theme, active }) => ({
    margin: '8px 16px',
    borderRadius: theme.shape.borderRadius,
    '&:hover': {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
    ...(active && {
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
    }),
}));

const Sidebar = ({ open }) => {
    const location = window.location.pathname;
    
    const menuItems = [
        { 
            text: 'Dashboard', 
            icon: <DashboardIcon />, 
            path: '/admin/dashboard',
            color: '#fff'
        },
        { 
            text: 'Users', 
            icon: <PeopleIcon />, 
            path: '/admin/users',
            color: '#fff'
        },
        { 
            text: 'Reports', 
            icon: <BarChartIcon />, 
            path: '/admin/reports',
            color: '#fff'
        },
        { 
            text: 'Settings', 
            icon: <SettingsIcon />, 
            path: '/admin/settings',
            color: '#fff'
        },
    ];

    const handleLogout = async () => {
        try {
            const response = await fetch('/admin/logout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
                },
                credentials: 'include',
            });

            if (response.ok) {
                window.location.href = '/admin/login';
            }
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    return (
        <DrawerStyled variant="permanent" open={open}>
            <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Avatar 
                    sx={{ 
                        width: 40, 
                        height: 40, 
                        bgcolor: 'primary.light',
                        mb: 1
                    }}
                >
                    A
                </Avatar>
            </Box>
            <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.12)' }} />
            <List sx={{ pt: 2 }}>
                {menuItems.map((item) => (
                    <MenuItemStyled
                        button
                        key={item.text}
                        active={location === item.path}
                        onClick={() => {
                            window.location.href = item.path;
                        }}
                    >
                        <ListItemIcon sx={{ color: item.color, minWidth: 40 }}>
                            {item.icon}
                        </ListItemIcon>
                        <ListItemText 
                            primary={item.text} 
                        />
                    </MenuItemStyled>
                ))}
            </List>
        </DrawerStyled>
    );
};

export default Sidebar; 