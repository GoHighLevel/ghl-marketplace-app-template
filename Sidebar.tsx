"use client";

import { useAuth } from "./AuthContext";
import {
  Home,
  Users,
  Building,
  Shapes,
  MessageSquare,
  Calendar,
  DollarSign,
  ShoppingCart,
  Settings,
  LifeBuoy,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navigation = [
  { name: "Dashboard", href: "/", icon: Home },
  { name: "Companies / Locations", href: "/locations", icon: Building },
  { name: "Contacts & Customers", href: "/contacts", icon: Users },
  { name: "Custom Objects", href: "/custom-objects", icon: Shapes },
  { name: "Conversations", href: "/conversations", icon: MessageSquare },
  { name: "Calendar", href: "/calendar", icon: Calendar },
  { name: "Sales & Transactions", href: "/sales", icon: DollarSign },
  { name: "Shopify", href: "/shopify", icon: ShoppingCart },
];

const secondaryNavigation = [
  { name: "Settings", href: "/settings", icon: Settings },
  { name: "Help", href: "/help", icon: LifeBuoy },
];

function classNames(...classes: (string | boolean)[]) {
  return classes.filter(Boolean).join(" ");
}

export function Sidebar() {
  const pathname = usePathname();
  const { company, location } = useAuth();

  return (
    <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-64 lg:flex-col">
      <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-gray-950 px-6 pb-4">
        <div className="flex h-16 shrink-0 items-center">
          {/* You can replace this with a logo */}
          <h1 className="text-xl font-bold text-white">GHL Sales</h1>
        </div>
        <nav className="flex flex-1 flex-col">
          <ul role="list" className="flex flex-1 flex-col gap-y-7">
            <li>
              <ul role="list" className="-mx-2 space-y-1">
                {navigation.map((item) => (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      className={classNames(
                        pathname === item.href
                          ? "bg-gray-800 text-white"
                          : "text-gray-400 hover:bg-gray-800 hover:text-white",
                        "group flex gap-x-3 rounded-md p-2 text-sm font-semibold leading-6"
                      )}
                    >
                      <item.icon className="h-6 w-6 shrink-0" aria-hidden="true" />
                      {item.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </li>
            <li className="mt-auto">
               <div className="text-xs font-semibold leading-6 text-gray-400">Your Context</div>
               <div className="mt-2 space-y-1 text-sm">
                  <p className="text-white font-medium truncate">{company.name}</p>
                  <p className="text-gray-300 truncate">{location.name}</p>
               </div>
              <ul role="list" className="-mx-2 mt-6 space-y-1 border-t border-gray-700 pt-4">
                {secondaryNavigation.map((item) => (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      className={classNames(
                        pathname === item.href
                          ? "bg-gray-800 text-white"
                          : "text-gray-400 hover:bg-gray-800 hover:text-white",
                        "group flex gap-x-3 rounded-md p-2 text-sm font-semibold leading-6"
                      )}
                    >
                      <item.icon className="h-6 w-6 shrink-0" aria-hidden="true" />
                      {item.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </li>
          </ul>
        </nav>
      </div>
    </div>
  );
}