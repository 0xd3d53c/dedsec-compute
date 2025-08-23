"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Plus, Save, X } from "lucide-react"
import { createBrowserClient } from "@supabase/ssr"

interface Operation {
  id: string
  name: string
  description: string
  required_compute_power: number
  task_signature: string
  task_hash: string
  unlock_threshold: number
  parameters: any
  is_active: boolean
  created_at: string
}

interface CreateOperationProps {
  onOperationCreated: () => void
  adminId: string
}

export function CreateOperationDialog({ onOperationCreated, adminId }: CreateOperationProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    required_compute_power: 100,
    unlock_threshold: 50,
    parameters: "{}",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      )

      // Generate task signature and hash
      const taskSignature = `sig_${Math.random().toString(36).substring(2, 15)}_${Date.now()}`
      const taskHash = `hash_${formData.name.toLowerCase().replace(/\s+/g, "_")}_v1_2024`

      const { error } = await supabase.from("operations").insert({
        name: formData.name,
        description: formData.description,
        required_compute_power: formData.required_compute_power,
        task_signature: taskSignature,
        task_hash: taskHash,
        unlock_threshold: formData.unlock_threshold,
        parameters: JSON.parse(formData.parameters),
        created_by: adminId,
      })

      if (!error) {
        // Log admin action
        await supabase.from("admin_logs").insert({
          admin_id: adminId,
          action: "operation_created",
          target_type: "operation",
          details: { operation_name: formData.name },
        })

        setIsOpen(false)
        setFormData({
          name: "",
          description: "",
          required_compute_power: 100,
          unlock_threshold: 50,
          parameters: "{}",
        })
        onOperationCreated()
      }
    } catch (err) {
      console.error("Failed to create operation:", err)
    }

    setIsLoading(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="bg-cyan-600 hover:bg-cyan-500">
          <Plus className="w-4 h-4 mr-2" />
          Create Operation
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-slate-950 border-cyan-400 text-cyan-400">
        <DialogHeader>
          <DialogTitle className="text-cyan-400">Create New Operation</DialogTitle>
          <DialogDescription className="text-cyan-300">
            Define a new distributed computing operation for the network
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name" className="text-cyan-400">
              Operation Name
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="bg-slate-950 border-cyan-400 text-cyan-400"
              placeholder="OPERATION_NEW_TASK"
              required
            />
          </div>
          <div>
            <Label htmlFor="description" className="text-cyan-400">
              Description
            </Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="bg-slate-950 border-cyan-400 text-cyan-400"
              placeholder="Describe what this operation does..."
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="compute_power" className="text-cyan-400">
                Required Compute Power
              </Label>
              <Input
                id="compute_power"
                type="number"
                value={formData.required_compute_power}
                onChange={(e) => setFormData({ ...formData, required_compute_power: Number.parseInt(e.target.value) })}
                className="bg-slate-950 border-cyan-400 text-cyan-400"
                min="1"
                required
              />
            </div>
            <div>
              <Label htmlFor="unlock_threshold" className="text-cyan-400">
                Unlock Threshold
              </Label>
              <Input
                id="unlock_threshold"
                type="number"
                value={formData.unlock_threshold}
                onChange={(e) => setFormData({ ...formData, unlock_threshold: Number.parseInt(e.target.value) })}
                className="bg-slate-950 border-cyan-400 text-cyan-400"
                min="1"
                required
              />
            </div>
          </div>
          <div>
            <Label htmlFor="parameters" className="text-cyan-400">
              Parameters (JSON)
            </Label>
            <Textarea
              id="parameters"
              value={formData.parameters}
              onChange={(e) => setFormData({ ...formData, parameters: e.target.value })}
              className="bg-slate-950 border-cyan-400 text-cyan-400"
              placeholder='{"algorithm": "example", "iterations": 1000}'
              required
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="bg-cyan-600 hover:bg-cyan-500">
              <Save className="w-4 h-4 mr-2" />
              {isLoading ? "Creating..." : "Create Operation"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function AdminPasswordChange({ adminId }: { adminId: string }) {
  const [isOpen, setIsOpen] = useState(false)
  const [passwords, setPasswords] = useState({
    current: "",
    new: "",
    confirm: "",
  })
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    if (passwords.new !== passwords.confirm) {
      setError("New passwords do not match")
      setIsLoading(false)
      return
    }

    if (passwords.current !== "admin") {
      setError("Current password is incorrect")
      setIsLoading(false)
      return
    }

    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      )

      // In production, this would hash the password properly
      // For now, we'll just log the password change
      await supabase.from("admin_logs").insert({
        admin_id: adminId,
        action: "password_changed",
        details: { note: "Admin password updated" },
      })

      setIsOpen(false)
      setPasswords({ current: "", new: "", confirm: "" })
      alert('Password changed successfully! (Demo mode - password remains "admin")')
    } catch (err) {
      setError("Failed to change password")
    }

    setIsLoading(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="border-cyan-400 text-cyan-400 hover:bg-cyan-400 hover:text-slate-950 bg-transparent"
        >
          Change Password
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-slate-950 border-cyan-400 text-cyan-400">
        <DialogHeader>
          <DialogTitle className="text-cyan-400">Change Admin Password</DialogTitle>
          <DialogDescription className="text-cyan-300">
            Update your admin account password for enhanced security
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="current" className="text-cyan-400">
              Current Password
            </Label>
            <Input
              id="current"
              type="password"
              value={passwords.current}
              onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
              className="bg-slate-950 border-cyan-400 text-cyan-400"
              required
            />
          </div>
          <div>
            <Label htmlFor="new" className="text-cyan-400">
              New Password
            </Label>
            <Input
              id="new"
              type="password"
              value={passwords.new}
              onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
              className="bg-slate-950 border-cyan-400 text-cyan-400"
              required
            />
          </div>
          <div>
            <Label htmlFor="confirm" className="text-cyan-400">
              Confirm New Password
            </Label>
            <Input
              id="confirm"
              type="password"
              value={passwords.confirm}
              onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
              className="bg-slate-950 border-cyan-400 text-cyan-400"
              required
            />
          </div>
          {error && <div className="text-red-400 text-sm p-2 border border-red-400 rounded">{error}</div>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="bg-cyan-600 hover:bg-cyan-500">
              {isLoading ? "Updating..." : "Update Password"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
