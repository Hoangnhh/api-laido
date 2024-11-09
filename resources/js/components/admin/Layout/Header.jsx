import React from 'react';
import {
    AppBar,
    Toolbar,
    Typography,
    IconButton,
} from '@mui/material';
import {
    Menu as MenuIcon,
    ChevronLeft as ChevronLeftIcon,
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';

const drawerWidth = 280;

const AppBarStyled = styled(AppBar, {
    shouldForwardProp: (prop) => prop !== 'open',
})(({ theme, open }) => ({
    zIndex: theme.zIndex.drawer + 1,
    backgroundColor: '#fff',
    color: theme.palette.text.primary,
    boxShadow: 'none',
    borderBottom: '1px solid rgba(0, 0, 0, 0.12)',
    transition: theme.transitions.create(['width', 'margin'], {
        easing: theme.transitions.easing.sharp,
        duration: theme.transitions.duration.leavingScreen,
    }),
    ...(open && {
        marginLeft: drawerWidth,
        width: `calc(100% - ${drawerWidth}px)`,
        transition: theme.transitions.create(['width', 'margin'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
        }),
    }),
}));

const Header = ({ open, toggleDrawer }) => {
    return (
        <AppBarStyled position="absolute" open={open}>
            <Toolbar sx={{ pr: '24px' }}>
                <IconButton
                    edge="start"
                    color="inherit"
                    aria-label="open drawer"
                    onClick={toggleDrawer}
                    sx={{
                        marginRight: '36px',
                        backgroundColor: open ? 'rgba(0, 0, 0, 0.04)' : 'transparent',
                        '&:hover': {
                            backgroundColor: 'rgba(0, 0, 0, 0.08)',
                        },
                    }}
                >
                    {open ? <ChevronLeftIcon /> : <MenuIcon />}
                </IconButton>
                <Typography
                    component="h1"
                    variant="h6"
                    color="inherit"
                    noWrap
                    sx={{ flexGrow: 1 }}
                >
                    Admin Dashboard
                </Typography>
            </Toolbar>
        </AppBarStyled>
    );
};

export default Header; 