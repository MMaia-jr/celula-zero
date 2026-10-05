// SPDX-License-Identifier: MPL-2.0
import Foundation
import Security
import Darwin

guard CommandLine.arguments.count == 4 else { exit(20) }
let operation = CommandLine.arguments[1]
let service = CommandLine.arguments[2]
let account = CommandLine.arguments[3]
let input = FileHandle.standardInput.readDataToEndOfFile()
let payload = (try? JSONSerialization.jsonObject(with: input)) as? [String: String] ?? [:]
var query: [String: Any] = [
  kSecClass as String: kSecClassGenericPassword,
  kSecAttrService as String: service,
  kSecAttrAccount as String: account,
]

switch operation {
case "get":
  query[kSecMatchLimit as String] = kSecMatchLimitOne
  query[kSecReturnData as String] = true
  var result: CFTypeRef?
  let status = SecItemCopyMatching(query as CFDictionary, &result)
  if status == errSecItemNotFound { exit(3) }
  guard status == errSecSuccess, let data = result as? Data else { exit(4) }
  FileHandle.standardOutput.write(Data(data.base64EncodedString().utf8))
case "set":
  guard let value = payload["value"], let data = value.data(using: .utf8) else { exit(5) }
  let updates: [String: Any] = [
    kSecValueData as String: data,
    kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly,
  ]
  let status = SecItemUpdate(query as CFDictionary, updates as CFDictionary)
  if status == errSecItemNotFound {
    query.merge(updates) { _, new in new }
    guard SecItemAdd(query as CFDictionary, nil) == errSecSuccess else { exit(6) }
  } else if status != errSecSuccess { exit(6) }
  FileHandle.standardOutput.write(Data("OK".utf8))
case "delete":
  let status = SecItemDelete(query as CFDictionary)
  guard status == errSecSuccess || status == errSecItemNotFound else { exit(7) }
  FileHandle.standardOutput.write(Data("OK".utf8))
default:
  exit(8)
}
