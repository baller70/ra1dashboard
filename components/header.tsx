
'use client'

import { useState } from 'react'
import Link from 'next/link'
// Temporarily disabled until Clerk is properly configured
// import { useUser, useClerk } from '@clerk/nextjs'
import { User, LogOut, Menu, X } from 'lucide-react'
import { Button } from './ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'
import { NotificationDropdown } from './ui/notification-dropdown'

export function Header() {
  // Temporarily disabled for development - uncomment when Clerk is properly configured
  // const { user } = useUser()
  // const { signOut } = useClerk()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Mock user data for development (remove when Clerk is configured)
  const user = {
    id: 'dev-user',
    firstName: 'Admin',
    lastName: 'User',
    emailAddresses: [{ emailAddress: 'admin@riseasone.com' }],
    publicMetadata: { role: 'admin' }
  }

  const navigation = [
    { name: 'Dashboard', href: '/' },
    { name: 'Parents', href: '/parents' },
    { name: 'Payments', href: '/payments' },
    { name: 'Communication', href: '/communication' },
    { name: 'Contracts', href: '/contracts' },
    { name: 'Settings', href: '/settings' },
  ]

  const handleSignOut = () => {
    // signOut({ redirectUrl: '/' })
    console.log('Sign out clicked - Clerk not configured yet')
  }

  // Show sign-in prompt if no user (when Clerk is enabled)
  // if (!user) {
  //   return (
  //     <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
  //       <div className="container flex h-16 items-center justify-between">
  //         <div className="flex items-center space-x-4">
  //           <Link href="/" className="flex items-center space-x-2">
  //             <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
  //               <span className="text-white font-bold text-sm">R1</span>
  //             </div>
  //             <span className="font-bold text-xl">Rise as One</span>
  //           </Link>
  //         </div>
  //         <div className="flex items-center space-x-4">
  //           <Button asChild>
  //             <Link href="/sign-in">Sign In</Link>
  //           </Button>
  //         </div>
  //       </div>
  //     </header>
  //   )
  // }

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo */}
        <div className="flex items-center space-x-4">
          <Link href="/" className="flex items-center space-x-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">R1</span>
            </div>
            <span className="font-bold text-xl">Rise as One</span>
          </Link>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-8">
          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {item.name}
            </Link>
          ))}
        </nav>

        {/* User Actions */}
        <div className="flex items-center space-x-4">
          {/* Notifications */}
          <NotificationDropdown userId={user.id} />

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <User className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <div className="flex items-center justify-start gap-2 p-2">
                <div className="flex flex-col space-y-1 leading-none">
                  <p className="font-medium">{user?.firstName} {user?.lastName}</p>
                  <p className="w-[200px] truncate text-sm text-muted-foreground">
                    {user?.emailAddresses[0]?.emailAddress}
                  </p>
                  {user?.publicMetadata?.role && typeof user.publicMetadata.role === 'string' && (
                    <p className="text-xs text-muted-foreground capitalize">
                      Role: {user.publicMetadata.role}
                    </p>
                  )}
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer" onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sign out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Mobile menu button */}
          <Button
            variant="ghost"
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden">
          <div className="space-y-1 px-2 pb-3 pt-2">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="block rounded-md px-3 py-2 text-base font-medium text-muted-foreground hover:text-foreground hover:bg-muted"
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.name}
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  )
}
