import { Mail, Phone, Building, MessageCircle } from 'lucide-react'
import type { Contact } from '@/types'
import { Card } from '@/components/ui/Card'

interface ContactCardProps {
  contact: Contact
  onClick: () => void
}

export const ContactCard = ({ contact, onClick }: ContactCardProps) => {
  return (
    <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={onClick}>
      <div className="space-y-3">
        {/* Name */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{contact.name}</h3>
          {contact.company && (
            <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
              <Building className="w-4 h-4" />
              <span>{contact.company}</span>
            </div>
          )}
        </div>

        {/* Contact info */}
        <div className="space-y-2 text-sm">
          {contact.phone && (
            <div className="flex items-center gap-2 text-gray-600">
              <Phone className="w-4 h-4" />
              <span>{contact.phone}</span>
            </div>
          )}

          {contact.email && (
            <div className="flex items-center gap-2 text-gray-600">
              <Mail className="w-4 h-4" />
              <span>{contact.email}</span>
            </div>
          )}

          {contact.telegram && (
            <div className="flex items-center gap-2 text-gray-600">
              <MessageCircle className="w-4 h-4" />
              <span>{contact.telegram}</span>
            </div>
          )}
        </div>

        {/* Notes preview */}
        {contact.notes && (
          <p className="text-sm text-gray-500 line-clamp-2">{contact.notes}</p>
        )}
      </div>
    </Card>
  )
}
