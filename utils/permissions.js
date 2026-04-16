const { PermissionFlagsBits } = require('discord.js');

const PERM_MAP = {
    BanMembers:       PermissionFlagsBits.BanMembers,
    KickMembers:      PermissionFlagsBits.KickMembers,
    ModerateMembers:  PermissionFlagsBits.ModerateMembers,
    ManageMessages:   PermissionFlagsBits.ManageMessages,
    ManageChannels:   PermissionFlagsBits.ManageChannels,
    ManageRoles:      PermissionFlagsBits.ManageRoles,
    Administrator:    PermissionFlagsBits.Administrator,
};

function hasPermission(member, permName) {
    if (!member) return false;
    if (member.permissions.has(PermissionFlagsBits.Administrator)) return true;
    const flag = PERM_MAP[permName];
    if (!flag) return false;
    return member.permissions.has(flag);
}

function getMissingPermissions(member, permNames) {
    return permNames.filter(p => !hasPermission(member, p));
}

module.exports = { hasPermission, getMissingPermissions, PERM_MAP };
