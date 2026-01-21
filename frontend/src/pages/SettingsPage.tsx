import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useLocale } from '@/contexts/localeContext'
import { invitesService } from '@/services/invites.service'
import { profileService } from '@/services/profile.service'
import type {
  Invite,
  InviteCreateInput,
  PasswordChangeInput,
  Profile,
} from '@/types'

type SettingsTab = 'profile' | 'password' | 'invites'

export const SettingsPage = () => {
  const { t } = useLocale()
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile')
  const [profile, setProfile] = useState<Profile | null>(null)
  const [invites, setInvites] = useState<Invite[]>([])
  const [loadingInvites, setLoadingInvites] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [sendingInvite, setSendingInvite] = useState(false)

  const {
    register: registerProfile,
    handleSubmit: handleProfileSubmit,
    formState: { errors: profileErrors },
    reset: resetProfile,
  } = useForm<Profile>()

  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    formState: { errors: passwordErrors },
    watch: watchPassword,
    reset: resetPassword,
  } = useForm<PasswordChangeInput & { confirm_password: string }>()

  const {
    register: registerInvite,
    handleSubmit: handleInviteSubmit,
    formState: { errors: inviteErrors },
    reset: resetInvite,
  } = useForm<InviteCreateInput>()

  const remainingInvites = profile?.invites_remaining ?? 0

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await profileService.getProfile()
        setProfile(data)
        resetProfile(data)
      } catch {
        toast.error(t('settings.profile.loadFail'))
      }
    }

    fetchProfile()
  }, [resetProfile, t])

  const fetchInvites = async () => {
    setLoadingInvites(true)
    try {
      const data = await invitesService.listInvites()
      setInvites(data.results)
    } catch {
      toast.error(t('settings.invites.loadFail'))
    } finally {
      setLoadingInvites(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'invites') {
      fetchInvites()
    }
  }, [activeTab])

  const handleProfileSave = async (data: Profile) => {
    setSavingProfile(true)
    try {
      const updated = await profileService.updateProfile({
        full_name: data.full_name,
        telegram_username: data.telegram_username,
      })
      setProfile(updated)
      resetProfile(updated)
      toast.success(t('settings.profile.saveSuccess'))
    } catch {
      toast.error(t('settings.profile.saveFail'))
    } finally {
      setSavingProfile(false)
    }
  }

  const handlePasswordSave = async (
    data: PasswordChangeInput & { confirm_password: string }
  ) => {
    if (data.new_password !== data.confirm_password) {
      toast.error(t('settings.password.mismatch'))
      return
    }
    setSavingPassword(true)
    try {
      await profileService.changePassword({
        old_password: data.old_password,
        new_password: data.new_password,
      })
      toast.success(t('settings.password.saveSuccess'))
      resetPassword()
    } catch {
      toast.error(t('settings.password.saveFail'))
    } finally {
      setSavingPassword(false)
    }
  }

  const handleInviteSend = async (data: InviteCreateInput) => {
    setSendingInvite(true)
    try {
      await invitesService.createInvite(data)
      toast.success(t('settings.invites.sendSuccess'))
      resetInvite()
      await fetchInvites()
      const updatedProfile = await profileService.getProfile()
      setProfile(updatedProfile)
      resetProfile(updatedProfile)
    } catch {
      toast.error(t('settings.invites.sendFail'))
    } finally {
      setSendingInvite(false)
    }
  }

  const handleInviteRevoke = async (invite: Invite) => {
    if (!window.confirm(t('settings.invites.revokeConfirm'))) return
    try {
      await invitesService.revokeInvite(invite.id)
      toast.success(t('settings.invites.revokeSuccess'))
      await fetchInvites()
      const updatedProfile = await profileService.getProfile()
      setProfile(updatedProfile)
      resetProfile(updatedProfile)
    } catch {
      toast.error(t('settings.invites.revokeFail'))
    }
  }

  const passwordConfirmError = useMemo(() => {
    const newPassword = watchPassword('new_password')
    const confirmPassword = watchPassword('confirm_password')
    if (!confirmPassword) return undefined
    if (newPassword !== confirmPassword) {
      return t('settings.password.mismatch')
    }
    return undefined
  }, [watchPassword, t])

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          {t('settings.title')}
        </h1>
        <p className="text-gray-500 dark:text-gray-400">{t('settings.subtitle')}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {(['profile', 'password', 'invites'] as SettingsTab[]).map(tab => (
          <Button
            key={tab}
            variant={activeTab === tab ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setActiveTab(tab)}
          >
            {t(`settings.tabs.${tab}`)}
          </Button>
        ))}
      </div>

      {activeTab === 'profile' && (
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6 space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              {t('settings.profile.title')}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('settings.profile.hint')}
            </p>
          </div>
          <form onSubmit={handleProfileSubmit(handleProfileSave)} className="space-y-4">
            <Input
              label={t('settings.profile.username')}
              value={profile?.username ?? ''}
              disabled
              readOnly
            />
            <Input
              label={t('settings.profile.fullName')}
              {...registerProfile('full_name')}
              error={profileErrors.full_name?.message}
              placeholder={t('settings.profile.fullNamePlaceholder')}
            />
            <Input
              label={t('settings.profile.telegram')}
              {...registerProfile('telegram_username')}
              error={profileErrors.telegram_username?.message}
              placeholder={t('settings.profile.telegramPlaceholder')}
            />
            <div className="flex justify-end">
              <Button type="submit" isLoading={savingProfile}>
                {t('settings.profile.save')}
              </Button>
            </div>
          </form>
        </div>
      )}

      {activeTab === 'password' && (
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6 space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              {t('settings.password.title')}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('settings.password.hint')}
            </p>
          </div>
          <form onSubmit={handlePasswordSubmit(handlePasswordSave)} className="space-y-4">
            <Input
              label={t('settings.password.current')}
              type="password"
              {...registerPassword('old_password', {
                required: t('settings.password.required'),
              })}
              error={passwordErrors.old_password?.message}
            />
            <Input
              label={t('settings.password.new')}
              type="password"
              {...registerPassword('new_password', {
                required: t('settings.password.required'),
              })}
              error={passwordErrors.new_password?.message}
            />
            <Input
              label={t('settings.password.confirm')}
              type="password"
              {...registerPassword('confirm_password', {
                required: t('settings.password.required'),
              })}
              error={passwordErrors.confirm_password?.message || passwordConfirmError}
            />
            <div className="flex justify-end">
              <Button type="submit" isLoading={savingPassword}>
                {t('settings.password.save')}
              </Button>
            </div>
          </form>
        </div>
      )}

      {activeTab === 'invites' && (
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6 space-y-6">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              {t('settings.invites.title')}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('settings.invites.remaining')} {remainingInvites}
            </p>
          </div>
          <form onSubmit={handleInviteSubmit(handleInviteSend)} className="space-y-4">
            <Input
              label={t('settings.invites.email')}
              type="email"
              {...registerInvite('email', { required: t('settings.invites.emailRequired') })}
              error={inviteErrors.email?.message}
              placeholder="colleague@example.com"
            />
            <div className="flex justify-end">
              <Button type="submit" isLoading={sendingInvite} disabled={remainingInvites <= 0}>
                {t('settings.invites.send')}
              </Button>
            </div>
          </form>

          <div className="border-t border-gray-200 dark:border-gray-800 pt-4 space-y-3">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {t('settings.invites.listTitle')}
            </h3>
            {loadingInvites ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('settings.invites.loading')}
              </p>
            ) : invites.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('settings.invites.empty')}
              </p>
            ) : (
              <div className="space-y-3">
                {invites.map(invite => (
                  <div
                    key={invite.id}
                    className="flex flex-wrap items-center justify-between gap-3 border border-gray-200 dark:border-gray-800 rounded-lg p-4"
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {invite.email}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {t(`settings.invites.status.${invite.status}`)}
                      </p>
                    </div>
                    {invite.status === 'pending' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleInviteRevoke(invite)}
                      >
                        {t('settings.invites.revoke')}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
