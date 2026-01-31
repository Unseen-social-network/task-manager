import { useCallback, useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { useLocale } from '@/contexts/localeContext'
import { invitesService } from '@/services/invites.service'
import { getApiErrorMessage } from '@/utils/helpers'
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
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile')
  const [profile, setProfile] = useState<Profile | null>(null)
  const [invites, setInvites] = useState<Invite[]>([])
  const [loadingInvites, setLoadingInvites] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [sendingInvite, setSendingInvite] = useState(false)
  const [connectingTelegram, setConnectingTelegram] = useState(false)
  const [disconnectingTelegram, setDisconnectingTelegram] = useState(false)
  const [sharingContact, setSharingContact] = useState(false)
  const [updatingInviteShare, setUpdatingInviteShare] = useState(false)

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

  const getPasswordValidationError = (password?: string): string | null => {
    if (!password) return t('settings.password.required')
    if (password.length < 8) return t('settings.password.min')
    if (!/[A-Z]/.test(password)) return t('settings.password.upper')
    if (!/[a-z]/.test(password)) return t('settings.password.lower')
    if (!/[0-9]/.test(password)) return t('settings.password.number')
    return null
  }

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

  const fetchInvites = useCallback(async () => {
  setLoadingInvites(true)
  try {
        const data = await invitesService.listInvites()
        setInvites(data.results)
      } catch {
        toast.error(t('settings.invites.loadFail'))
      } finally {
        setLoadingInvites(false)
      }
    }, [t])

  useEffect(() => {
      if (activeTab === 'invites') {
        fetchInvites()
      }
    }, [activeTab, fetchInvites])

  const handleProfileSave = async (data: Profile) => {
    setSavingProfile(true)
    try {
      const updated = await profileService.updateProfile({
        full_name: data.full_name,
        telegram_notifications_enabled: data.telegram_notifications_enabled,
        telegram_notify_on_tag: data.telegram_notify_on_tag,
        default_task_view: data.default_task_view,
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
    const passwordError = getPasswordValidationError(data.new_password)
    if (passwordError) {
      toast.error(passwordError)
      return
    }
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
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('settings.password.saveFail')))
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
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('settings.invites.sendFail')))
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
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('settings.invites.revokeFail')))
    }
  }

  const handleShareContact = async () => {
    setSharingContact(true)
    try {
      const share = await profileService.shareContact()
      await navigator.clipboard.writeText(share.share_url)
      setProfile(prev => (prev ? { ...prev, self_contact_id: share.contact_id } : prev))
      toast.success(t('settings.profile.shareContactSuccess'))
    } catch {
      toast.error(t('settings.profile.shareContactFail'))
    } finally {
      setSharingContact(false)
    }
  }

  const handleInviteShareToggle = async (enabled: boolean) => {
    if (!profile) return
    setUpdatingInviteShare(true)
    try {
      const updated = await profileService.updateProfile({
        share_invite_contact: enabled,
      })
      setProfile(updated)
      resetProfile(updated)
      toast.success(t('settings.invites.shareToggleSuccess'))
    } catch {
      toast.error(t('settings.invites.shareToggleFail'))
    } finally {
      setUpdatingInviteShare(false)
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

  const newPassword = watchPassword('new_password')
  const passwordStrength = useMemo(() => {
    const hasMin = newPassword?.length >= 8
    const hasUpper = /[A-Z]/.test(newPassword || '')
    const hasLower = /[a-z]/.test(newPassword || '')
    const hasNumber = /[0-9]/.test(newPassword || '')
    const hasSpecial = /[^A-Za-z0-9]/.test(newPassword || '')
    const hasLong = newPassword?.length >= 16
    const meetsBase = hasMin && hasUpper && hasLower && hasNumber

    if (!meetsBase) {
      return {
        percent: 33,
        label: t('settings.password.strengthWeak'),
        color: 'bg-red-500',
      }
    }

    if (hasLong && hasSpecial) {
      return {
        percent: 100,
        label: t('settings.password.strengthStrong'),
        color: 'bg-green-500',
      }
    }

    return {
      percent: 66,
      label: t('settings.password.strengthMedium'),
      color: 'bg-yellow-500',
    }
  }, [newPassword, t])

  const canConnectTelegram = Boolean(profile?.telegram_link_url)
  const telegramHelpLink = useMemo(() => {
    if (!profile?.telegram_link_url) return null
    try {
      const url = new URL(profile.telegram_link_url)
      url.searchParams.set('start', 'help')
      return url.toString()
    } catch {
      return null
    }
  }, [profile?.telegram_link_url])

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            {t('settings.title')}
          </h1>
          <p className="text-gray-500 dark:text-gray-400">{t('settings.subtitle')}</p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => navigate(-1)}>
          {t('settings.back')}
        </Button>
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
            <div className="space-y-1">
              <Select
                label={t('settings.profile.taskViewLabel')}
                {...registerProfile('default_task_view')}
                options={[
                  { value: 'list', label: t('settings.profile.taskView.list') },
                  { value: 'kanban', label: t('settings.profile.taskView.kanban') },
                ]}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t('settings.profile.taskViewHint')}
              </p>
            </div>
            <Input
              label={t('settings.profile.telegramId')}
              value={profile?.telegram_chat_id ? String(profile.telegram_chat_id) : ''}
              placeholder={t('settings.profile.telegramIdPlaceholder')}
              disabled
              readOnly
            />
            <div className="rounded-lg border border-dashed border-gray-200 dark:border-gray-700 p-4 space-y-3">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {t('settings.profile.telegramConnectTitle')}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {t('settings.profile.telegramConnectHint')}
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={!canConnectTelegram}
                  isLoading={connectingTelegram}
                  onClick={() => {
                    if (!profile?.telegram_link_url) return
                    setConnectingTelegram(true)
                    profileService
                      .refreshTelegramLink()
                      .then(updated => {
                        setProfile(updated)
                        resetProfile(updated)
                        if (updated.telegram_link_url) {
                          window.open(
                            updated.telegram_link_url,
                            '_blank',
                            'noopener,noreferrer'
                          )
                        } else {
                          toast.error(t('settings.profile.telegramLinkMissing'))
                        }
                      })
                      .catch(() => {
                        toast.error(t('settings.profile.telegramLinkFail'))
                      })
                      .finally(() => {
                        setConnectingTelegram(false)
                      })
                  }}
                >
                  {profile?.telegram_connected
                    ? t('settings.profile.telegramReconnect')
                    : t('settings.profile.telegramConnect')}
                </Button>
                {profile?.telegram_connected && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    isLoading={disconnectingTelegram}
                    onClick={() => {
                      setDisconnectingTelegram(true)
                      profileService
                        .disconnectTelegramLink()
                        .then(updated => {
                          setProfile(updated)
                          resetProfile(updated)
                          toast.success(t('settings.profile.telegramDisconnected'))
                        })
                        .catch(() => {
                          toast.error(t('settings.profile.telegramDisconnectFail'))
                        })
                        .finally(() => {
                          setDisconnectingTelegram(false)
                        })
                    }}
                  >
                    {t('settings.profile.telegramDisconnect')}
                  </Button>
                )}
                {profile?.telegram_connected && telegramHelpLink && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      window.open(telegramHelpLink, '_blank', 'noopener,noreferrer')
                    }}
                  >
                    {t('settings.profile.telegramFindBot')}
                  </Button>
                )}
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {profile?.telegram_connected
                    ? t('settings.profile.telegramConnected')
                    : t('settings.profile.telegramNotConnected')}
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  {...registerProfile('telegram_notifications_enabled')}
                />
                {t('settings.profile.telegramNotifications')}
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  {...registerProfile('telegram_notify_on_tag')}
                />
                {t('settings.profile.telegramTagNotifications')}
              </label>
            </div>
            <div className="rounded-lg border border-dashed border-gray-200 dark:border-gray-700 p-4 space-y-2">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {t('settings.profile.shareContactTitle')}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t('settings.profile.shareContactHint')}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleShareContact}
                  isLoading={sharingContact}
                >
                  {t('settings.profile.shareContact')}
                </Button>
                {profile?.self_contact_id && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(`/contacts?contact=${profile.self_contact_id}`)}
                  >
                    {t('settings.profile.shareContactManage')}
                  </Button>
                )}
              </div>
            </div>
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
                validate: value => getPasswordValidationError(value) ?? true,
              })}
              error={passwordErrors.new_password?.message}
            />
            <div className="space-y-2 text-xs text-gray-500 dark:text-gray-400">
              <p>{t('settings.password.requirements')}</p>
              <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${passwordStrength.color}`}
                  style={{ width: `${passwordStrength.percent}%` }}
                />
              </div>
              <p className="text-[11px] uppercase tracking-wide text-gray-400">
                {t('settings.password.strengthLabel')} {passwordStrength.label}
              </p>
            </div>
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
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('settings.invites.invitedBy')}{' '}
              {profile?.inviter_username || 'System32'}
            </p>
          </div>
          {profile?.inviter_username && (
            <div className="rounded-lg border border-dashed border-gray-200 dark:border-gray-700 p-4 space-y-2">
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  checked={profile?.share_invite_contact ?? false}
                  onChange={event => handleInviteShareToggle(event.target.checked)}
                  disabled={updatingInviteShare}
                />
                {t('settings.invites.shareWithInviter')}
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t('settings.invites.shareWithInviterHint')}
              </p>
            </div>
          )}
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
                        {t('settings.invites.invitedBy')}{' '}
                        {invite.invited_by_username || 'System32'}
                      </p>
                      {invite.invited_user_username && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {t('settings.invites.acceptedUser')} @{invite.invited_user_username}
                        </p>
                      )}
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
